import type TS from "typescript"

import type { QingkuaiFileInfo } from "../file"
import type { TypescriptAdapter } from "../adapter"
import type { Pair } from "../../../../../types/common"
import type { Getter } from "../../../../../types/util"
import type { LSDiagnostic } from "../../types/adapter"

import type {
    GetDiagnosticResultItem,
    TSDiagnosticRelatedInformation
} from "../../../../../types/communication"
import type { Range } from "vscode-languageserver-types"
import type { TsGetDiagsMethod } from "../../types/service"

import {
    isString,
    debugAssert,
    isQingkuaiFileName,
    isNodeEnvironment
} from "../../../../../shared-util/assert"
import { QingkuaiNotFound } from "../../messages/error"
import { constants as qingkuaiConstants } from "qingkuai/compiler"
import { isIndexesInvalid } from "../../../../../shared-util/qingkuai"

export function getAndConvertDiagnostics(adapter: TypescriptAdapter, fileName: string) {
    const filePath = adapter.getNormalizedPath(fileName)
    const languageService = adapter.getDefaultLanguageService(filePath)!
    const fileInfo = adapter.service.ensureGetQingkuaiFileInfo(filePath)
    if (!debugAssert(languageService)) {
        return []
    }

    const result: GetDiagnosticResultItem[] = []
    const diagnostics = [...fileInfo.lsDiagnostics]
    const program = adapter.getDefaultProgram(filePath)!
    const diagnosticMethods: TsGetDiagsMethod[] = ["getSyntacticDiagnostics"]

    // Semtic 模式下进行全部诊断，PartialSemantic/Syntactic 模式下只进行语法检查
    if (adapter.projectService.serverMode === adapter.ts.LanguageServiceMode.Semantic) {
        diagnosticMethods.push("getSemanticDiagnostics", "getSuggestionDiagnostics")
    }
    diagnosticMethods.forEach(m => diagnostics.push(...languageService[m](fileName)))

    const correctLocDiagnostics = correctDiagnosticLoc(
        adapter.ts,
        fileInfo,
        diagnostics,
        () => {
            return program
        },
        () => {
            return program.getSourceFile(filePath)!
        },
        path => {
            return adapter.service.ensureGetQingkuaiFileInfo(path)
        }
    )
    for (const item of correctLocDiagnostics) {
        const sourceStart = item.start!
        const sourceEnd = sourceStart + item.length!
        const relatedInformations: TSDiagnosticRelatedInformation[] = []
        const locationConvertor = adapter.service.createLocationConvertor(filePath)
        const formattedMsg = formatTsDiatnosticMsg(item.messageText)
        for (const relatedInfo of item.relatedInformation ?? []) {
            let range: Range
            const relatedSourceFile = relatedInfo.file!
            const relatedSourceStart = relatedInfo.start!
            const relatedSourceEnd = relatedSourceStart + relatedInfo.length!
            const relatedFilePath = adapter.getNormalizedPath(relatedSourceFile.fileName)
            if (!isQingkuaiFileName(relatedFilePath ?? "")) {
                range = {
                    start: relatedSourceFile.getLineAndCharacterOfPosition(relatedSourceStart),
                    end: relatedSourceFile.getLineAndCharacterOfPosition(relatedSourceEnd)
                }
            } else {
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
                message: formatTsDiatnosticMsg(relatedInfo.messageText)
            })
        }
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

export function correctDiagnosticLoc(
    ts: typeof TS,
    fileInfo: QingkuaiFileInfo,
    diagnostics: LSDiagnostic[],
    getProgram: Getter<TS.Program>,
    getSourceFile: Getter<TS.SourceFile>,
    getFileInfo: (fileName: string) => QingkuaiFileInfo
) {
    const program = getProgram()
    const result: LSDiagnostic[] = []
    const isNodeEnv = isNodeEnvironment()
    const compilerOptions = program.getCompilerOptions()
    if (isNodeEnv && (fileInfo.isTS || compilerOptions.checkJs)) {
        if (
            !ts.resolveModuleName("qingkuai", fileInfo.path, compilerOptions, ts.sys).resolvedModule
        ) {
            const [code, message] = QingkuaiNotFound()
            diagnostics.push({
                code,
                start: 0,
                length: 1,
                source: "qk",
                isSourceLoc: true,
                messageText: message,
                file: getSourceFile(),
                category: ts.DiagnosticCategory.Error
            })
        }
    }

    for (let i = 0; i < diagnostics.length; i++) {
        const item = diagnostics[i]
        const start = item.start ?? 0
        const end = start + (item.length ?? 0)
        const relatedInformations: TS.DiagnosticRelatedInformation[] = []
        const sourceStart = item.isSourceLoc ? start : fileInfo.getSourceIndex(start)
        const sourceEnd = item.isSourceLoc ? end : fileInfo.getSourceIndex(end)
        if (
            isIndexesInvalid(sourceStart, sourceEnd) ||
            shouldDiagnosticBeIgnored(item, fileInfo, [sourceStart, sourceEnd])
        ) {
            continue
        }

        for (const relatedInfo of item.relatedInformation ?? []) {
            if (!relatedInfo.file) {
                continue
            }

            const relatedSourceFile = relatedInfo.file
            if (!relatedSourceFile) {
                continue
            }

            const start = relatedInfo.start ?? 0
            const end = start + (relatedInfo.length ?? 0)
            const relatedFileInfo = getFileInfo(relatedSourceFile.fileName)
            const relatedFilePath = ts.server.toNormalizedPath(relatedSourceFile.fileName)
            if (isQingkuaiFileName(relatedFilePath ?? "")) {
                const relatedSourceStart = relatedFileInfo.getSourceIndex(start)
                const relatedSourceEnd = relatedFileInfo.getSourceIndex(end)
                if (isIndexesInvalid(relatedSourceStart, relatedSourceEnd)) {
                    continue
                }
                relatedInfo.start = relatedSourceStart
                relatedInfo.length = relatedSourceEnd - relatedSourceStart
            }
            relatedInformations.push(relatedInfo)
        }
        result.push({
            ...item,
            start: sourceStart,
            length: sourceEnd - sourceStart
        })
    }
    return result
}

function formatTsDiatnosticMsg(mt: string | TS.DiagnosticMessageChain, indentLevel = 0): string {
    const indentStr = "  ".repeat(indentLevel)
    if (isString(mt)) {
        return indentStr + mt
    }
    const nextMsg = mt.next?.reduce((p, c) => {
        return p + "\n" + indentStr + formatTsDiatnosticMsg(c, indentLevel + 1)
    }, "")
    return indentStr + mt.messageText + (nextMsg ?? "")
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
