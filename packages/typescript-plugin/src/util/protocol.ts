import type TS from "typescript"
import type { Position, Range } from "vscode-languageserver"
import type { ConvertProtocolTextSpanWithContextVerifier } from "../types"

import { projectService } from "../state"
import { DEFAULT_PROTOCOL_LOCATION } from "../constant"
import { getDefaultSourceFileByFileName } from "./typescript"
import { isQingkuaiFileName } from "../../../../shared-util/assert"
import { isSourceIndexesInvalid } from "../../../../shared-util/qingkuai"
import { ensureGetSnapshotOfQingkuaiFile, getSourceIndex } from "./qingkuai"

// 将typescript-language-features扩展与ts服务器通信结果中qingkuai文件的TextSpanWithContext
// 的行列坐标修改到正确的源码位置（typescript语言服务获取到的qingkuai文件的坐标都是基于中间代码的）
export function convertProtocolTextSpanWithContext(
    fileName: string,
    textSpanWithContext: TS.server.protocol.TextSpanWithContext,
    verify?: ConvertProtocolTextSpanWithContextVerifier
) {
    if (!isQingkuaiFileName(fileName)) {
        return textSpanWithContext
    }

    if (!verify) {
        verify = () => !0
    }

    if (!projectService.getScriptInfo(fileName)) {
        return textSpanWithContext
    }

    const sourceFile = getDefaultSourceFileByFileName(fileName)!
    const qingkuaiSnapshot = ensureGetSnapshotOfQingkuaiFile(fileName)
    const interStartIndex = sourceFile.getPositionOfLineAndCharacter(
        textSpanWithContext.start.line - 1,
        textSpanWithContext.start.offset - 1
    )
    const interEndIndex = sourceFile.getPositionOfLineAndCharacter(
        textSpanWithContext.end.line - 1,
        textSpanWithContext.end.offset - 1
    )
    const sourceStartIndex = getSourceIndex(qingkuaiSnapshot, interStartIndex)
    const sourceEndIndex = getSourceIndex(qingkuaiSnapshot, interEndIndex, true)
    if (
        isSourceIndexesInvalid(sourceStartIndex, sourceEndIndex) ||
        !verify(sourceStartIndex!, qingkuaiSnapshot, "start") ||
        !verify(sourceEndIndex!, qingkuaiSnapshot, "end")
    ) {
        return void 0
    }

    const sourceEndPosition = qingkuaiSnapshot.positions[sourceEndIndex!]
    const sourceStartPosition = qingkuaiSnapshot.positions[sourceStartIndex!]
    const result: TS.server.protocol.TextSpanWithContext = {
        start: {
            line: sourceStartPosition.line,
            offset: sourceStartPosition.column + 1
        },
        end: {
            line: sourceEndPosition.line,
            offset: sourceEndPosition.column + 1
        }
    }
    if (textSpanWithContext.contextStart) {
        const interContextStartIndex = sourceFile.getPositionOfLineAndCharacter(
            textSpanWithContext.contextStart.line - 1,
            textSpanWithContext.contextStart.offset - 1
        )
        const sourceContextStartIndex = getSourceIndex(qingkuaiSnapshot, interContextStartIndex)
        if (
            !isSourceIndexesInvalid(sourceContextStartIndex) &&
            verify(sourceContextStartIndex!, qingkuaiSnapshot, "contextStart")
        ) {
            const sourceContextStartPosition = qingkuaiSnapshot.positions[sourceContextStartIndex!]
            result.contextStart = {
                line: sourceContextStartPosition.line,
                offset: sourceContextStartPosition.column + 1
            }
        }
    }
    if (textSpanWithContext.contextEnd) {
        const interContextEndIndex = sourceFile.getPositionOfLineAndCharacter(
            textSpanWithContext.contextEnd.line - 1,
            textSpanWithContext.contextEnd.offset - 1
        )
        const sourceContextEndIndex = getSourceIndex(qingkuaiSnapshot, interContextEndIndex, true)
        if (
            !isSourceIndexesInvalid(sourceContextEndIndex) &&
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
        const convertRes = convertProtocolTextSpanWithContext(item.file, item)
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
