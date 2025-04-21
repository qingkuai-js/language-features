import TS from "typescript"
import type {
    GetDiagnosticResultItem,
    TSDiagnosticRelatedInformation
} from "../../../../../types/communication"
import type { Range } from "vscode-languageserver-types"
import type { DiagnosticKind } from "../../types/service"
import type { RealPath } from "../../../../../types/common"

import { lsRange } from "../convert/struct"
import { getRealPath, getSourceIndex } from "../qingkuai"
import { getLineAndCharacter, qingkuaiDiagnostics } from "../state"
import { INTER_NAMESPACE } from "../../../../../shared-util/constant"
import { isIndexesInvalid } from "../../../../../shared-util/qingkuai"
import { isQingkuaiFileName, isString, isUndefined } from "../../../../../shared-util/assert"

export function getAndConvertDiagnostics(
    languageService: TS.LanguageService,
    fileName: RealPath,
    isSemanticProject: boolean
): GetDiagnosticResultItem[] {
    const diagnostics: TS.Diagnostic[] = []
    const diagnosticMethods: DiagnosticKind[] = ["getSyntacticDiagnostics"]

    // Semtic模式下进行全部诊断，PartialSemantic/Syntactic模式下只进行语法检查
    if (isSemanticProject) {
        diagnosticMethods.push("getSemanticDiagnostics", "getSuggestionDiagnostics")
    }

    diagnosticMethods.forEach(m => {
        diagnostics.push(...languageService[m](fileName))
    })

    const result: GetDiagnosticResultItem[] = []
    for (const item of diagnostics.concat(qingkuaiDiagnostics.get(getRealPath(fileName)) || [])) {
        const start = item.start ?? 0
        const end = start + (item.length ?? 0)
        const ss = getSourceIndex(fileName, start)
        const se = getSourceIndex(fileName, end, true)
        if (isIndexesInvalid(ss, se)) {
            continue
        }

        const relatedInformations: TSDiagnosticRelatedInformation[] = []
        const filteredRelatedInformations = (item.relatedInformation || []).filter(ri => !!ri.file)
        for (const ri of filteredRelatedInformations) {
            let range: Range
            const start = ri.start ?? 0
            const end = start + (ri.length ?? 0)
            const realPath = getRealPath(ri.file!.fileName)
            if (!isQingkuaiFileName(realPath)) {
                range = {
                    start: getLineAndCharacter(realPath, start)!,
                    end: getLineAndCharacter(realPath, end)!
                }
            } else {
                const ss = getSourceIndex(realPath, start)
                const se = getSourceIndex(realPath, end, true)
                if (isIndexesInvalid(ss, se)) {
                    continue
                }
                range = lsRange.fromSourceStartAndEnd(realPath, ss, se)
            }
            relatedInformations.push({
                range,
                filePath: getRealPath(ri.file!.fileName),
                message: formatDiagnosticMessage(ri.messageText)
            })
        }

        result.push({
            relatedInformations,
            code: item.code,
            kind: item.category,
            source: item.source || "ts",
            deprecated: Boolean(item.reportsDeprecated),
            unnecessary: Boolean(item.reportsUnnecessary),
            message: formatDiagnosticMessage(item.messageText),
            range: lsRange.fromSourceStartAndEnd(fileName, ss, se)
        })
    }
    return result
}

// 诊断信息为链表形式时，将其整理为一个字符串表示
function formatDiagnosticMessage(mt: string | TS.DiagnosticMessageChain, indentLevel = 0): string {
    const indent = " ".repeat(indentLevel * 2)

    const eliminate = (s: string) => {
        return s.replace(` Did you mean '${INTER_NAMESPACE}'?`, "")
    }

    if (isString(mt)) {
        return eliminate(mt)
    }

    if (isUndefined(mt.next)) {
        return eliminate(mt.messageText)
    }

    const nextMsg = mt.next.reduce((p, c) => {
        return p + indent + formatDiagnosticMessage(c, indentLevel + 1)
    }, "")

    return eliminate(mt.messageText) + "\n" + nextMsg
}
