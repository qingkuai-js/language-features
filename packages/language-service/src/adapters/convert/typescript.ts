import type TS from "typescript"

import { getRealPath } from "../qingkuai"
import { isUndefined } from "../../../../../shared-util/assert"

// 将JsDoc中的标签信息转换为Markdown字符串
export function convertJsDocTagsToMarkdown(tags: TS.JSDocTagInfo[]) {
    const labels = tags.map(tag => {
        switch (tag.name) {
            case "augments":
            case "extends":
            case "param":
            case "template": {
                const body = getTagBody(tag)
                if (body?.length === 3) {
                    const param = body[1]
                    const doc = body[2]
                    const label = `*@${tag.name}* \`${param}\``
                    if (!doc) {
                        return label
                    }
                    return label + (doc.match(/\r\n|\n/g) ? "  \n" + doc : ` \u2014 ${doc}`)
                }
                break
            }
            case "return":
            case "returns": {
                // For return(s), we require a non-empty body
                if (!tag.text?.length) {
                    return undefined
                }

                break
            }
        }

        // Generic tag
        const label = `*@${tag.name}*`
        const text = getTagBodyText(tag)
        if (!text) {
            return label
        }
        return label + (text.match(/\r\n|\n/g) ? "  \n" + text : ` \u2014 ${text}`)
    })
    return labels.filter(label => !!label).join("  \n\n")
}

// 将SymbolDisplayPart[]类型转换为带有链接的markdown纯文本
export function convertDisplayPartsToPlainTextWithLink(parts: TS.SymbolDisplayPart[] | undefined) {
    if (isUndefined(parts)) {
        return ""
    }

    return parts.reduce((ret, part) => {
        if (part.kind === "linkText") {
            let spaceIndex = part.text.indexOf(" ")
            if (spaceIndex === -1) {
                spaceIndex = part.text.length
            }
            return ret + `[${part.text.slice(spaceIndex)}](${part.text.slice(0, spaceIndex)})`
        } else if (part.kind === "linkName") {
            const target: TS.DocumentSpan = (part as any).target
            const args = encodeURIComponent(
                JSON.stringify({
                    end: target.textSpan.start,
                    start: target.textSpan.start,
                    path: getRealPath(target.fileName)
                })
            )
            return ret + `[${part.text}](command:qingkuai.openFileByFilePath?${args})`
        }
        return (ret + (part.kind === "link" ? "" : part.text || "")).replace("__c__.", "")
    }, "")
}

function getTagBodyText(tag: TS.JSDocTagInfo): string | undefined {
    if (!tag.text) {
        return undefined
    }

    function makeCodeblock(text: string): string {
        if (/^\s*[~`]{3}/m.test(text)) {
            return text
        }
        return "```\n" + text + "\n```"
    }

    let text = convertDisplayPartsToPlainTextWithLink(tag.text)
    switch (tag.name) {
        case "example": {
            const captionTagMatches = text.match(/<caption>(.*?)<\/caption>\s*(\r\n|\n)/)
            if (captionTagMatches && captionTagMatches.index === 0) {
                return (
                    captionTagMatches[1] +
                    "\n" +
                    makeCodeblock(text.slice(captionTagMatches[0].length))
                )
            } else {
                return makeCodeblock(text)
            }
        }
        case "author": {
            const emailMatch = text.match(/(.+)\s<([-.\w]+@[-.\w]+)>/)
            if (emailMatch === null) {
                return text
            } else {
                return `${emailMatch[1]} ${emailMatch[2]}`
            }
        }
        case "default": {
            return makeCodeblock(text)
        }
        default: {
            return text
        }
    }
}

function getTagBody(tag: TS.JSDocTagInfo): Array<string> | undefined {
    if (tag.name === "template") {
        const parts = tag.text
        if (parts && typeof parts !== "string") {
            const docs = parts.filter(p => p.kind === "text")
            const docsText = docs.map(p => p.text.replace(/^\s*-?\s*/, "")).join(" ")
            const params = parts.filter(p => p.kind === "typeParameterName")
            const paramsText = params.map(p => p.text).join(", ")

            return params ? ["", paramsText, docsText] : undefined
        }
    }
    return convertDisplayPartsToPlainTextWithLink(tag.text).split(/^(\S+)\s*-?\s*/)
}
