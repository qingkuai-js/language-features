import type { FixedArray } from "../types/util"
import type { CompletionItem, CompletionParams, Range } from "vscode-languageserver/node"

import { connection } from "./index.test"
import { isUndefined } from "../shared-util/assert"
import { assert, describe, expect, it, test } from "vitest"
import { formatSourceCode, openContentAsTextDocument } from "../shared-util/tests"

describe("Html character entity completions:", () => {
    it("Should receive all entity suggestion items in response.", async () => {
        await openContentAsTextDocument("&")
        await doComplete(0, 1, "&").then(completions => {
            completions?.forEach(item => {
                assertTextEditRange(item, 0, 0, 0, 1)
                expect(item.textEdit?.newText[0]).toBe("&")
            })
            expect(completions?.length).toBe(2125)
        })
    })

    it("Should receive all entity suggestion items with special range(0, 1 - 0, 8) in response.", async () => {
        await openContentAsTextDocument("a&aacute")
        await doComplete(0, 8).then(completions => {
            completions?.forEach(item => {
                assertTextEditRange(item, 0, 1, 0, 8)
                expect(item.textEdit?.newText[0]).toBe("&")
            })
            expect(completions?.length).toBe(2125)
        })
    })

    it("Should receive all entity suggestion items with special range to replace the existing entity item in response.", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                &LT
                ___&equals;___
            `)
        )

        await Promise.all([
            doComplete(0, 2).then(completions => {
                completions?.forEach(item => {
                    assertTextEditRange(item, 0, 0, 0, 3)
                    expect(item.textEdit?.newText[0]).toBe("&")
                })
                expect(completions?.length).toBe(2125)
            }),
            doComplete(1, 8).then(completions => {
                completions?.forEach(item => {
                    assertTextEditRange(item, 1, 3, 1, 11)
                    expect(item.textEdit?.newText[0]).toBe("&")
                })
                expect(completions?.length).toBe(2125)
            })
        ])
    })

    test("Whether html character entity completion suggestion functions is valid in text content section of any tag.", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                <div>xxx&amxxx</div>
                <span>
                    <i>
                        xxx&ampxxx
                    </i>
                </span>
                <input>
                &am<br />-&lt
            `)
        )
        await Promise.all([
            doComplete(0, 11).then(completions => {
                completions?.forEach(item => {
                    assertTextEditRange(item, 0, 8, 0, 11)
                    expect(item.textEdit?.newText[0]).toBe("&")
                })
                expect(completions?.length).toBe(2125)
            }),
            doComplete(3, 15).then(completions => {
                completions?.forEach(item => {
                    assertTextEditRange(item, 3, 11, 3, 15)
                    expect(item.textEdit?.newText[0]).toBe("&")
                })
                expect(completions?.length).toBe(2125)
            }),
            doComplete(7, 3).then(completions => {
                completions?.forEach(item => {
                    assertTextEditRange(item, 7, 0, 7, 3)
                    expect(item.textEdit?.newText[0]).toBe("&")
                })
                expect(completions?.length).toBe(2125)
            }),
            doComplete(7, 13).then(completions => {
                completions?.forEach(item => {
                    assertTextEditRange(item, 7, 10, 7, 13)
                    expect(item.textEdit?.newText[0]).toBe("&")
                })
                expect(completions?.length).toBe(2125)
            })
        ])
    })

    test("Whether html character entity completion suggestion functions is valid in attribute value section of any tag.", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                <div class="&">
                    <input value="&quot"
            `)
        )
        await Promise.all([
            doComplete(0, 13).then(completions => {
                completions?.forEach(item => {
                    assertTextEditRange(item, 0, 12, 0, 13)
                    expect(item.textEdit?.newText[0]).toBe("&")
                })
                expect(completions?.length).toBe(2125)
            }),
            doComplete(1, 23).then(completions => {
                completions?.forEach(item => {
                    assertTextEditRange(item, 1, 18, 1, 23)
                    expect(item.textEdit?.newText[0]).toBe("&")
                })
                expect(completions?.length).toBe(2125)
            })
        ])
    })
})

// 断言CompletionIte.textEdit.range
function assertTextEditRange(
    ...[item, sl, sc, el, ec]: [CompletionItem, ...FixedArray<number, 4>]
) {
    if (!item.textEdit || !("range" in item.textEdit)) {
        assert.fail("CompletionItem.textEdit is not a TextEdit structure")
    }
    expect(item.textEdit.range).toEqual<Range>({
        start: { line: sl, character: sc },
        end: { line: el, character: ec }
    })
}

// 此方法用于模拟请求qingkuai语言服务器以获取补全建议
async function doComplete(line: number, character: number, triggerChar?: string) {
    const ret: CompletionItem[] | undefined = await connection.sendRequest(
        "textDocument/completion",
        {
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
    )
    return ret
}
