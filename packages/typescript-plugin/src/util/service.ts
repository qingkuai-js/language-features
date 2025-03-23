import type TS from "typescript"
import type { Range } from "vscode-languageserver"
import type { RealPath } from "../../../../types/common"

import { ts } from "../state"
import { getDefaultSourceFileByFileName } from "./typescript"
import { isQingkuaiFileName } from "../../../../shared-util/assert"
import { isSourceIndexesInvalid } from "../../../../shared-util/qingkuai"
import { ensureGetSnapshotOfQingkuaiFile, getSourceIndex } from "./qingkuai"

// 将TextSpan转换为vscode扩展需要的Range形式，若目标为qingkuai文件则需要将中间代码索引替换为源码索引并从源码文本中查找位置
export function convertTextSpanToRange(fileName: RealPath, span: TS.TextSpan): Range | undefined {
    const sourceFile = getDefaultSourceFileByFileName(fileName)!
    if (!isQingkuaiFileName(fileName)) {
        return {
            start: sourceFile.getLineAndCharacterOfPosition(span.start),
            end: sourceFile.getLineAndCharacterOfPosition(ts.textSpanEnd(span))
        }
    }

    const qingkuaiSnapshot = ensureGetSnapshotOfQingkuaiFile(fileName)
    const sourceStartIndex = getSourceIndex(qingkuaiSnapshot, span.start)
    const sourceEndIndex = getSourceIndex(qingkuaiSnapshot, ts.textSpanEnd(span))
    if (isSourceIndexesInvalid(sourceStartIndex, sourceEndIndex)) {
        return void 0
    }

    const sourceStartPosition = qingkuaiSnapshot.positions[sourceStartIndex!]
    const sourceEndPosition = qingkuaiSnapshot.positions[sourceEndIndex!]
    return {
        start: {
            line: sourceStartPosition.line - 1,
            character: sourceStartPosition.column
        },
        end: {
            line: sourceEndPosition.line - 1,
            character: sourceEndPosition.column
        }
    }
}
