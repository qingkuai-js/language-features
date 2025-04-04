import type { TSDiagnostic } from "../../../../types/communication"
import type { Diagnostic, DiagnosticRelatedInformation } from "vscode-languageserver/node"

import {
    tpic,
    documents,
    connection,
    isTestingEnv,
    waittingCommands,
    cssLanguageService,
    limitedScriptLanguageFeatures
} from "../state"
import { URI } from "vscode-uri"
import { getCompileRes } from "../compile"
import { stringifyRange } from "../util/vscode"
import { badComponentAttrMessageRE } from "../regular"
import { isNull } from "../../../../shared-util/assert"
import { debounce } from "../../../../shared-util/sundry"
import { TPICHandler } from "../../../../shared-util/constant"
import { createStyleSheetAndDocument } from "../util/qingkuai"
import { DiagnosticTag, DiagnosticSeverity } from "vscode-languageserver/node"

export const publishDiagnostics = debounce(
    async (uri: string) => {
        const document = documents.get(uri)
        if (!document || isTestingEnv) {
            return null
        }

        // 用于避免在相同的位置放至信息及代码均相同的ts诊断结果
        const existingTsDiagnostics = new Set<string>()

        const cr = await getCompileRes(document)
        const { Error, Warning } = DiagnosticSeverity
        const waittingForCommand = waittingCommands.get("diagnostic")
        const { messages, getRange, filePath, getSourceIndex, config } = cr

        if (!limitedScriptLanguageFeatures && waittingForCommand) {
            await tpic.sendRequest(TPICHandler.WaitForTSCommand, waittingForCommand)
            waittingCommands.delete("diagnostic")
        }

        // 将ts语言服务的诊断信息添加到诊断结果
        const extendDiagnostic = (item: Diagnostic) => {
            const stringifiedRange = stringifyRange(item.range)
            const existingKey = `${stringifiedRange}:${item.message}(${item.code})`
            if (!existingTsDiagnostics.has(existingKey)) {
                existingTsDiagnostics.add(existingKey)
                diagnostics.push(item)
            }
        }

        // qingkuai编译器诊断结果（错误：1xxx，警告：9xxx）
        const diagnostics: Diagnostic[] = messages.map(({ type, value }) => {
            const severity = type === "error" ? Error : Warning
            const range = getRange(value.loc.start.index, value.loc.end.index)
            return {
                range,
                severity,
                source: "qk",
                code: value.code,
                message: value.message
            }
        })

        // 添加样式块的诊断信息
        cr.inputDescriptor.styles.forEach(descriptor => {
            const [document, _, styleSheet] = createStyleSheetAndDocument(
                cr,
                descriptor.loc.start.index
            )!
            diagnostics.push(...cssLanguageService.doValidation(document, styleSheet))
        })

        // 处理javascript/typescript语言服务的诊断结果（通过请求ts插件的ipc服务器获取)
        let tsDiagnostics: TSDiagnostic[] = []
        if (!limitedScriptLanguageFeatures) {
            tsDiagnostics = await tpic.sendRequest<string, TSDiagnostic[]>(
                TPICHandler.GetDiagnostic,
                filePath
            )
        }
        for (const item of tsDiagnostics) {
            const tags: DiagnosticTag[] = []
            const sourceIndex = document.offsetAt(item.range.start)
            const relatedInformation: DiagnosticRelatedInformation[] = []
            if (item.deprecated) {
                tags.push(DiagnosticTag.Deprecated)
            }
            if (item.unnecessary) {
                tags.push(DiagnosticTag.Unnecessary)
            }
            for (const relatedInfo of item.relatedInformations) {
                relatedInformation.push({
                    message: relatedInfo.message,
                    location: {
                        range: relatedInfo.range,
                        uri: URI.file(relatedInfo.filePath).toString()
                    }
                })
            }

            // 为指定的诊断信息添加qingkuai相关解释
            if (config.extensionConfig.typescriptDiagnosticsExplain) {
                if (
                    item.code === 2353 &&
                    item.source === "ts" &&
                    cr.isPositionFlagSet(sourceIndex, "isAttributeStart")
                ) {
                    const m = badComponentAttrMessageRE.exec(item.message)
                    if (!isNull(m)) {
                        item.message += `\n(Qingkuai explain): The attribute name is not a property of component's ${m[1]} type.`
                    }
                }
            }

            extendDiagnostic({
                ...item,
                tags,
                relatedInformation,
                severity: transTsDiagnosticSeverity(item.kind)
            })
        }

        connection.sendNotification("textDocument/publishDiagnostics", { uri, diagnostics })
    },
    300,
    debounceIdGetter
)

// 清空诊断信息
export function clearDiagnostics(uri: string) {
    connection.sendNotification("textDocument/publishDiagnostics", {
        uri,
        diagnostics: []
    })
}

function debounceIdGetter(uri: string) {
    return uri
}

// typescript诊断结果类型转换为vscode需要的对应类型
function transTsDiagnosticSeverity(n: number) {
    switch (n) {
        case 0:
            return DiagnosticSeverity.Warning
        case 1:
            return DiagnosticSeverity.Error
        case 2:
            return DiagnosticSeverity.Hint
        default:
            return DiagnosticSeverity.Information
    }
}
