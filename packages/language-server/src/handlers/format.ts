import type { FormatHandler } from "../types/handlers"

import prettier from "prettier"
import { getCompileRes } from "../compile"
import { documents, Logger } from "../state"
import { isUndefined } from "../../../../shared-util/assert"

export const format: FormatHandler = async ({ textDocument }) => {
    const document = documents.get(textDocument.uri)
    if (isUndefined(document)) {
        return null
    }

    const { config } = await getCompileRes(document)
    try {
        const formatedContent = await prettier.format(document.getText(), {
            ...config.prettierConfig,
            parser: "qingkuai",
            plugins: [
                "/Users/lianggaoqiang/Desktop/QingKuai/language-features/node_modules/prettier-plugin-qingkuai/dist/index.js"
            ],
            spaceAroundInterpolation: config.extensionConfig.insertSpaceAroundInterpolation,
            componentTagFormatPreference: config.extensionConfig.componentTagFormatPreference
        })

        return [
            {
                range: {
                    start: document.positionAt(0),
                    end: document.positionAt(document.getText().length)
                },
                newText: formatedContent
            }
        ]
    } catch (e: any) {
        Logger.error("Formatting failure with an fatal error: " + e.message || "")
    }
}
