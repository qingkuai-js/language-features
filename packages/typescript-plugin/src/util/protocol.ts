import type TS from "typescript"
import type { RealPath } from "../../../../types/common"
import type { Position, Range } from "vscode-languageserver"
import type { ConvertProtocolTextSpanWithContextVerifier } from "../types"

import { projectService } from "../state"
import { DEFAULT_PROTOCOL_LOCATION } from "../constant"
import { getDefaultSourceFileByFileName } from "./typescript"
import { isIndexesInvalid } from "../../../../shared-util/qingkuai"
import { debugAssert, isQingkuaiFileName } from "../../../../shared-util/assert"
import { ensureGetSnapshotOfQingkuaiFile, getRealPath, getSourceIndex } from "./qingkuai"

// 将typescript-language-features扩展与ts服务器通信结果中qingkuai文件的TextSpan的行列
// 坐标修改到正确的源码位置（typescript语言服务获取到的qingkuai文件的坐标都是基于中间代码的）
export function convertProtocolTextSpan(
    fileName: RealPath,
    span: TS.server.protocol.TextSpan,
    verify?: ConvertProtocolTextSpanWithContextVerifier
) {
    if (!isQingkuaiFileName(fileName)) {
        return span
    }

    if (!verify) {
        verify = () => !0
    }

    debugAssert(projectService.getScriptInfo(fileName))

    const sourceFile = getDefaultSourceFileByFileName(fileName)!
    const qingkuaiSnapshot = ensureGetSnapshotOfQingkuaiFile(fileName)
    const interStartIndex = sourceFile.getPositionOfLineAndCharacter(
        span.start.line - 1,
        span.start.offset - 1
    )
    const interEndIndex = sourceFile.getPositionOfLineAndCharacter(
        span.end.line - 1,
        span.end.offset - 1
    )
    const sourceStartIndex = getSourceIndex(qingkuaiSnapshot, interStartIndex)
    const sourceEndIndex = getSourceIndex(qingkuaiSnapshot, interEndIndex, true)
    if (
        isIndexesInvalid(sourceStartIndex, sourceEndIndex) ||
        !verify(sourceStartIndex!, qingkuaiSnapshot, "start") ||
        !verify(sourceEndIndex!, qingkuaiSnapshot, "end")
    ) {
        return void 0
    }

    const sourceEndPosition = qingkuaiSnapshot.positions[sourceEndIndex!]
    const sourceStartPosition = qingkuaiSnapshot.positions[sourceStartIndex!]
    return {
        start: {
            line: sourceStartPosition.line,
            offset: sourceStartPosition.column + 1
        },
        end: {
            line: sourceEndPosition.line,
            offset: sourceEndPosition.column + 1
        }
    } satisfies TS.server.protocol.TextSpan
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

    const convertTextSpan = convertProtocolTextSpan(fileName, span, verify)
    if (!convertTextSpan) {
        return void 0
    }

    const sourceFile = getDefaultSourceFileByFileName(fileName)!
    const qingkuaiSnapshot = ensureGetSnapshotOfQingkuaiFile(fileName)
    const result: TS.server.protocol.TextSpanWithContext = convertTextSpan
    if (span.contextStart) {
        const interContextStartIndex = sourceFile.getPositionOfLineAndCharacter(
            span.contextStart.line - 1,
            span.contextStart.offset - 1
        )
        const sourceContextStartIndex = getSourceIndex(qingkuaiSnapshot, interContextStartIndex)
        if (
            !isIndexesInvalid(sourceContextStartIndex) &&
            verify(sourceContextStartIndex!, qingkuaiSnapshot, "contextStart")
        ) {
            const sourceContextStartPosition = qingkuaiSnapshot.positions[sourceContextStartIndex!]
            result.contextStart = {
                line: sourceContextStartPosition.line,
                offset: sourceContextStartPosition.column + 1
            }
        }
    }
    if (span.contextEnd) {
        const interContextEndIndex = sourceFile.getPositionOfLineAndCharacter(
            span.contextEnd.line - 1,
            span.contextEnd.offset - 1
        )
        const sourceContextEndIndex = getSourceIndex(qingkuaiSnapshot, interContextEndIndex, true)
        if (
            !isIndexesInvalid(sourceContextEndIndex) &&
            verify(sourceContextEndIndex!, qingkuaiSnapshot, "contextEnd")
        ) {
            const sourceContextEndPosition = qingkuaiSnapshot.positions[sourceContextEndIndex!]
            result.contextEnd = {
                line: sourceContextEndPosition.line,
                offset: sourceContextEndPosition.column + 1
            }
        }
    }
    return result
}

// 将typescript-language-features扩展与ts服务器通信结果中找到的定义位置转换为qingkuai文件的源码位置
export function convertProtocolDefinitions(
    definitions: TS.server.protocol.FileSpanWithContext[] | undefined
) {
    definitions?.forEach((item, index) => {
        const convertRes = convertProtocolTextSpanWithContext(
            (item.file = getRealPath(item.file)),
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
