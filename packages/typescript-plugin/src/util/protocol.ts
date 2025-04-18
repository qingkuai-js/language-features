import type TS from "typescript"
import type { RealPath } from "../../../../types/common"
import type { Position, Range } from "vscode-languageserver/node"
import type { ConvertProtocolTextSpanWithContextVerifier } from "../types"

import { projectService } from "../state"
import { DEFAULT_PROTOCOL_LOCATION } from "../constant"
import { isIndexesInvalid } from "../../../../shared-util/qingkuai"
import { debugAssert, isQingkuaiFileName } from "../../../../shared-util/assert"
import { convertor, getCompileInfo, qkContext } from "qingkuai-language-service/adapters"

// 将typescript-language-features扩展与ts服务器通信结果中qingkuai文件的TextSpan的行列
// 坐标修改到正确的源码位置（typescript语言服务获取到的qingkuai文件的坐标都是基于中间代码的）
export function convertProtocolTextSpan(
    fileName: RealPath,
    span: TS.server.protocol.TextSpan,
    verify?: ConvertProtocolTextSpanWithContextVerifier
): TS.server.protocol.TextSpan | undefined {
    if (!isQingkuaiFileName(fileName)) {
        return span
    }

    if (!verify) {
        verify = () => !0
    }

    debugAssert(projectService.getScriptInfo(fileName))

    const sourceStartIndex = convertor.protocolLocation.toSourceIndex(fileName, span.start)
    const sourceEndIndex = convertor.protocolLocation.toSourceIndex(fileName, span.end)
    if (
        isIndexesInvalid(sourceStartIndex, sourceEndIndex) ||
        !verify(fileName, sourceStartIndex!, "start") ||
        !verify(fileName, sourceEndIndex!, "end")
    ) {
        return void 0
    }
    return {
        end: sourceIndexToProtocolLocation(fileName, sourceEndIndex),
        start: sourceIndexToProtocolLocation(fileName, sourceStartIndex)
    }
}

// 此方法作用与convertProtocolTextSpan相似，但它处理的目标是TextSpanWithContext
export function convertProtocolTextSpanWithContext(
    fileName: RealPath,
    span: TS.server.protocol.TextSpanWithContext,
    verify?: ConvertProtocolTextSpanWithContextVerifier
) {
    if (!isQingkuaiFileName(fileName)) {
        return span
    }

    if (!verify) {
        verify = () => !0
    }

    const converted = convertProtocolTextSpan(
        fileName,
        span,
        verify
    ) as TS.server.protocol.TextSpanWithContext
    if (!converted) {
        return void 0
    }

    if (span.contextStart) {
        const sourceContextStartIndex = convertor.protocolLocation.toSourceIndex(
            fileName,
            span.contextStart
        )
        if (
            !isIndexesInvalid(sourceContextStartIndex) &&
            verify(fileName, sourceContextStartIndex!, "contextStart")
        ) {
            converted.contextStart = sourceIndexToProtocolLocation(
                fileName,
                sourceContextStartIndex
            )
        }
    }
    if (span.contextEnd) {
        const sourceContextEndIndex = convertor.protocolLocation.toSourceIndex(
            fileName,
            span.contextEnd
        )
        if (
            !isIndexesInvalid(sourceContextEndIndex) &&
            verify(fileName, sourceContextEndIndex!, "contextEnd")
        ) {
            converted.contextEnd = sourceIndexToProtocolLocation(fileName, sourceContextEndIndex)
        }
    }
    return converted
}

// 将typescript-language-features扩展与ts服务器通信结果中找到的定义位置转换为qingkuai文件的源码位置
export function convertProtocolDefinitions(
    definitions: TS.server.protocol.FileSpanWithContext[] | undefined
) {
    definitions?.forEach((item, index) => {
        const convertRes = convertProtocolTextSpanWithContext(
            (item.file = qkContext.getRealPath(item.file)),
            item
        )
        if (convertRes) {
            definitions[index] = { ...item, ...convertRes }
        } else {
            item.start = item.end = DEFAULT_PROTOCOL_LOCATION
            item.contextEnd && (item.contextEnd = DEFAULT_PROTOCOL_LOCATION)
            item.contextStart && (item.contextStart = DEFAULT_PROTOCOL_LOCATION)
        }
    })
}

export function convertProtocolTextSpanToRange(span: TS.server.protocol.TextSpan): Range {
    return {
        start: convertProtocolLocationToPosition(span.start),
        end: convertProtocolLocationToPosition(span.end)
    }
}

export function convertProtocolLocationToPosition(location: TS.server.protocol.Location): Position {
    return { line: location.line - 1, character: location.offset - 1 }
}

function sourceIndexToProtocolLocation(
    fileName: string,
    index: number
): TS.server.protocol.Location {
    const positions = getCompileInfo(fileName).positions
    if (!positions[index]) {
        return DEFAULT_PROTOCOL_LOCATION
    }
    return { line: positions[index].line, offset: positions[index].column + 1 }
}
