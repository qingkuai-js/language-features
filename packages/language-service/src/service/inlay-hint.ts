import { InlayHintKind, type InlayHint } from "vscode-languageserver-types"
import type { CompileResult } from "../../../../types/common"
import type { GetScriptInlayHintsFunc } from "../types/service"

import { traverseObject } from "../../../../shared-util/sundry"

export async function getInlayHint(
    cr: CompileResult,
    getScriptInlayHints: GetScriptInlayHintsFunc
) {
    const result: InlayHint[] = []
    const extensionConfig = cr.config?.extensionConfig
    if (cr.config?.extensionConfig.inlayHintReactiveStatus.length) {
        const fullText = cr.document.getText()
        traverseObject(cr.identifierStatusInfo, (_, info) => {
            for (const inlay of info.inlays) {
                if (!extensionConfig?.inlayHintReactiveStatus.includes(inlay.kind)) {
                    continue
                }
                result.push({
                    paddingLeft: true,
                    label: ":" + info.status,
                    position: cr.document.positionAt(inlay.index),
                    paddingRight: !!fullText.charAt(inlay.index)?.trim()
                })
            }
        })
    }

    const scriptHints = await getScriptInlayHints(cr.filePath)
    for (const hint of scriptHints) {
        let kind: InlayHint["kind"] | undefined
        switch (hint.kind) {
            case "Type":
                kind = InlayHintKind.Type
                break
            case "Parameter":
                kind = InlayHintKind.Parameter
                break
        }
        result.push({
            kind,
            label: hint.label,
            paddingLeft: hint.paddingLeft,
            paddingRight: hint.paddingRight,
            position: cr.document.positionAt(hint.pos)
        })
    }
    return result
}
