import type TS from "typescript"

import type { QingkuaiFileInfo } from "../file"
import type { TypescriptAdapter } from "../adapter"
import type { Pair } from "../../../../../types/common"

import type {
    GetDiagnosticResultItem,
    TSDiagnosticRelatedInformation
} from "../../../../../types/communication"
import type { Range } from "vscode-languageserver-types"
import type { TsGetDiagsMethod } from "../../types/service"

import { constants as qingkuaiConstants } from "qingkuai/compiler"
import { isIndexesInvalid } from "../../../../../shared-util/qingkuai"
import {
    isString,
    debugAssert,
    isQingkuaiFileName,
    isNodeEnvironment
} from "../../../../../shared-util/assert"
import { QingkuaiNotFound } from "../../messages/error"

export function getAndConvertDiagnostics(
    adapter: TypescriptAdapter,
    fileName: string
): GetDiagnosticResultItem[] {
    const filePath = adapter.getNormalizedPath(fileName)
    const languageService = adapter.getDefaultLanguageService(filePath)!
    const fileInfo = adapter.service.ensureGetQingkuaiFileInfo(filePath)
    if (!debugAssert(languageService)) {
        return []
    }

    const diagnostics = [...fileInfo.lsDiagnostics]
    const result: GetDiagnosticResultItem[] = []
    const diagnosticMethods: TsGetDiagsMethod[] = ["getSyntacticDiagnostics"]
    const isSemanticProject =
        adapter.projectService.serverMode === adapter.ts.LanguageServiceMode.Semantic

    const isNodeEnv = isNodeEnvironment()
    const program = adapter.getDefaultProgram(filePath)
    const compilerOptions = program!.getCompilerOptions()
    if (isNodeEnv && (fileInfo.isTS || compilerOptions.checkJs)) {
        if (
            !adapter.ts.resolveModuleName(
                "qingkuai",
                fileInfo.path,
                compilerOptions,
                adapter.ts.sys
            ).resolvedModule
        ) {
            const [code, message] = QingkuaiNotFound()
            diagnostics.push({
                code,
                start: 0,
                length: 1,
                source: "qk",
                isSourceLoc: true,
                messageText: message,
                file: adapter.getDefaultSourceFile(filePath)!,
                category: adapter.ts.DiagnosticCategory.Error
            })
        }
    }

    // Semtic 模式下进行全部诊断，PartialSemantic/Syntactic 模式下只进行语法检查
    if (isSemanticProject) {
        diagnosticMethods.push("getSemanticDiagnostics", "getSuggestionDiagnostics")
    }
    diagnosticMethods.forEach(m => diagnostics.push(...languageService[m](fileName)))

    for (const item of diagnostics) {
        const start = item.start ?? 0
        const end = start + (item.length ?? 0)
        const sourceStart = item.isSourceLoc ? start : fileInfo.getSourceIndex(start)
        const sourceEnd = item.isSourceLoc ? end : fileInfo.getSourceIndex(end)
        if (
            isIndexesInvalid(sourceStart, sourceEnd) ||
            shouldDiagnosticBeIgnored(item, fileInfo, [sourceStart, sourceEnd])
        ) {
            continue
        }

        const relatedInformations: TSDiagnosticRelatedInformation[] = []
        const filteredRelatedInformations = (item.relatedInformation || []).filter(ri => !!ri.file)
        for (const relatedInfo of filteredRelatedInformations) {
            const relatedSourceFile = relatedInfo.file
            if (!relatedSourceFile) {
                continue
            }

            let range: Range
            const start = relatedInfo.start ?? 0
            const end = start + (relatedInfo.length ?? 0)
            const relatedFileInfo = adapter.service.ensureGetQingkuaiFileInfo(
                relatedSourceFile.fileName
            )
            const relatedFilePath = adapter.getNormalizedPath(relatedSourceFile.fileName)
            if (!isQingkuaiFileName(relatedFilePath ?? "")) {
                range = {
                    start: relatedSourceFile.getLineAndCharacterOfPosition(start),
                    end: relatedSourceFile.getLineAndCharacterOfPosition(end)
                }
            } else {
                const relatedSourceStart = relatedFileInfo.getSourceIndex(start)
                const relatedSourceEnd = relatedFileInfo.getSourceIndex(end)
                if (isIndexesInvalid(relatedSourceStart, relatedSourceEnd)) {
                    continue
                }

                const relatedLocationConvertor =
                    adapter.service.createLocationConvertor(relatedFilePath)
                range = relatedLocationConvertor.languageServerRange.fromSourceStartAndEnd(
                    relatedSourceStart,
                    relatedSourceEnd
                )
            }
            relatedInformations.push({
                range,
                filePath: relatedFilePath,
                message: formatDiagnosticMessage(relatedInfo.messageText)
            })
        }

        const locationConvertor = adapter.service.createLocationConvertor(filePath)
        const formattedMsg = formatDiagnosticMessage(item.messageText)
        result.push({
            message: formattedMsg.replaceAll(` Did you mean '${qingkuaiConstants.LSC.UTIL}'?`, ""),
            range: locationConvertor.languageServerRange.fromSourceStartAndEnd(
                sourceStart,
                sourceEnd
            ),
            url: item.url,
            code: item.code,
            relatedInformations,
            kind: item.category,
            source: item.source || "ts",
            deprecated: Boolean(item.reportsDeprecated),
            unnecessary: Boolean(item.reportsUnnecessary)
        })
    }
    return result
}

function shouldDiagnosticBeIgnored(
    diag: TS.Diagnostic,
    fileInfo: QingkuaiFileInfo,
    sourceRange: Pair<number>
) {
    switch (diag.code) {
        case 6133: {
            if (fileInfo.isPositionFlagSetAtIndex("IsAttributeStart", sourceRange[0])) {
                return true
            }
            break
        }
    }
}

function formatDiagnosticMessage(mt: string | TS.DiagnosticMessageChain, indentLevel = 0): string {
    const indentStr = "  ".repeat(indentLevel)
    if (isString(mt)) {
        return indentStr + mt
    }
    const nextMsg = mt.next?.reduce((p, c) => {
        return p + "\n" + indentStr + formatDiagnosticMessage(c, indentLevel + 1)
    }, "")
    return indentStr + mt.messageText + (nextMsg ?? "")
}
