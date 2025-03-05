import type { HoverTipParams, HoverTipResult } from "../../../../../types/communication"

import {
    getDefaultLanguageServiceByFileName,
    convertDisplayPartsToPlainTextWithLink
} from "../../util/typescript"
import { server } from "../../state"
import { isUndefined } from "../../../../../shared-util/assert"
import { mdCodeBlockGen } from "../../../../../shared-util/docs"

export function attachHoverTip() {
    server.onRequest<HoverTipParams, HoverTipResult | null>("hoverTip", ({ fileName, pos }) => {
        const languageService = getDefaultLanguageServiceByFileName(fileName)
        const ret = languageService!.getQuickInfoAtPosition(fileName, pos)

        if (isUndefined(ret)) {
            return null
        }

        const { start, length } = ret.textSpan
        const display = convertDisplayPartsToPlainTextWithLink(ret.displayParts)
        const documentation = convertDisplayPartsToPlainTextWithLink(ret.documentation)
        return {
            posRange: [start, start + length],
            content: mdCodeBlockGen("ts", display) + "\n" + documentation
        }
    })
}
