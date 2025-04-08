import type { CompileResult } from "../../../../types/common"
import type { GetScriptDiagnosticsFunc } from "../types/service"
import type { Diagnostic, DiagnosticRelatedInformation } from "vscode-languageserver-types"

import { URI } from "vscode-uri"
import { stringifyRange } from "../util/sundry"
import { badComponentAttrMessageRE } from "../regular"
import { isNull } from "../../../../shared-util/assert"
import { GetDiagnosticResultItem } from "../../../../types/communication"
import { createStyleSheetAndDocument, cssLanguageService } from "../util/css"
import { DiagnosticSeverity, DiagnosticTag } from "vscode-languageserver-types"

export async function getDiagnostic(
    cr: CompileResult,
    getScriptDiagnostics: GetScriptDiagnosticsFunc
): Promise<Diagnostic[]> {
    // 用于避免在相同的位置放至信息及代码均相同的ts诊断结果
    const existingTsDiagnostics = new Set<string>()

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
    const diagnostics: Diagnostic[] = cr.messages.map(({ type, value }) => {
        return {
            source: "qk",
            code: value.code,
            message: value.message,
            range: cr.getRange(value.loc.start.index, value.loc.end.index),
            severity: type === "error" ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning
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

    // 处理javascript/typescript语言服务的诊断结果
    for (const item of await getScriptDiagnostics(cr.filePath)) {
        const tags: DiagnosticTag[] = []
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
        if (cr.config.extensionConfig?.typescriptDiagnosticsExplain) {
            attachQingkuaiExplain(cr, item, cr.getOffset(item.range.start))
        }
        extendDiagnostic({
            ...item,
            tags,
            relatedInformation,
            severity: transTsDiagnosticSeverity(item.kind)
        })
    }
    return diagnostics
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

// 为typescript诊断信息添加qingkuai相关解释
function attachQingkuaiExplain(
    cr: CompileResult,
    diagnostic: GetDiagnosticResultItem,
    sourceIndex: number
) {
    const addMessage = (msg: string) => {
        diagnostic.message += `\n(Qingkuai explain): ${msg}`
    }
    switch (diagnostic.code) {
        case 2351:
            if (cr.isPositionFlagSet(sourceIndex, "isComponentStart")) {
                addMessage(`The value of identifier is not a qingkuai component.`)
            }
            break
        case 2353: {
            if (cr.isPositionFlagSet(sourceIndex, "isAttributeStart")) {
                const m = badComponentAttrMessageRE.exec(diagnostic.message)
                if (!isNull(m)) {
                    addMessage(`The attribute name is not a property of component's ${m[1]} type.`)
                }
            }
            break
        }
    }
}
