import { CompletionItem, CompletionParams, Range, TextEdit } from "vscode-languageserver/node"

import { connection } from "./index.test"
import { describe, expect, it } from "vitest"
import { isUndefined } from "../shared-util/assert"
import { openContentAsTextDocument } from "../shared-util/tests"

const Request_Mthod = "textDocument/completion"

describe("html character entity completions", () => {
    it("should receive all entity suggestion items in response", async () => {
        await openContentAsTextDocument("&")

        const completions: CompletionItem[] | undefined = await connection.sendRequest(
            Request_Mthod,
            completionParamGen(0, 1, "&")
        )
        completions?.forEach(item => {
            expect(item.textEdit?.newText[0]).toBe("&")
            expect((item.textEdit as TextEdit).range).toEqual<Range>({
                start: { line: 0, character: 0 },
                end: { line: 0, character: 1 }
            })
        })
        expect(completions?.length).toBe(2125)
    })

    it.only("should receive all entity suggestion items with special range(0, 1 - 0, 8) in response", async () => {
        await openContentAsTextDocument("a&aacute")

        const completions: CompletionItem[] | undefined = await connection.sendRequest(
            Request_Mthod,
            completionParamGen(0, 8)
        )
        completions?.forEach(item => {
            expect(item.textEdit?.newText[0]).toBe("&")
            expect((item.textEdit as TextEdit).range).toEqual<Range>({
                start: { line: 0, character: 1 },
                end: { line: 0, character: 8 }
            })
        })
        expect(completions?.length).toBe(2125)
    })
})

// 生成textDocument/completion请求的参数
function completionParamGen(line: number, character: number, triggerChar?: string) {
    return {
        textDocument: {
            uri: ""
        },
        position: {
            line,
            character
        },
        context: {
            triggerCharacter: triggerChar,
            triggerKind: isUndefined(triggerChar) ? 1 : 2
        }
    } satisfies CompletionParams
}
