import type { CompileResult } from "../../../../types/common"

import prettier from "prettier"
import stripAnsi from "strip-ansi"

export async function format(pluginPath: string, cr: CompileResult, error: (msg: string) => void) {
    try {
        const formatedContent = await prettier.format(cr.inputDescriptor.source, {
            ...cr.config.prettierConfig,
            parser: "qingkuai",
            plugins: [pluginPath],
            ...cr.config.prettierConfig?.qingkuai
        })

        return [
            {
                range: {
                    start: cr.getPosition(0),
                    end: cr.getPosition(cr.inputDescriptor.source.length)
                },
                newText: formatedContent
            }
        ]
    } catch (e: any) {
        if (!e.message) {
            error("Fatal error encountered while formatting document(no related information)")
        }
        error("Fatala error encountered while formatting document: " + stripAnsi(e.message))
    }
}
