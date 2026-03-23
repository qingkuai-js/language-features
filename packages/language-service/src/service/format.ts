import type { CompileResult } from "../../../../types/common"

import stripAnsi from "strip-ansi"

import { PrettierAndPlugins } from "../types/service"

export async function format(
    formater: PrettierAndPlugins,
    cr: CompileResult,
    error: (msg: string) => void
) {
    try {
        const source = cr.document.getText()
        const [{ format }, ...plugins] = formater
        const formatedContent = await format(source, {
            plugins,
            parser: "qingkuai",
            ...cr.config?.prettierConfig,
            ...cr.config?.prettierConfig?.qingkuai
        })

        return [
            {
                range: {
                    start: cr.document.positionAt(0),
                    end: cr.document.positionAt(source.length)
                },
                newText: formatedContent
            }
        ]
    } catch (e: any) {
        if (!e.message) {
            error("Fatal error encountered while formatting document(no related information)")
        }
        error("Fatal error encountered while formatting document: " + stripAnsi(e.message))
    }
}
