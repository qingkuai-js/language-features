import type {
    Range,
    CompletionItem,
    CompletionList,
    CompletionParams
} from "vscode-languageserver/node"
import type { FixedArray } from "../types/util"

import { connection } from "./index.test"
import { isUndefined } from "../shared-util/assert"
import { assert, describe, expect, it, test } from "vitest"
import { formatSourceCode, openContentAsTextDocument } from "../shared-util/tests"

describe("Emmet functions:", () => {
    test("emmet syntax is avaliable.", async () => {
        await openContentAsTextDocument("div")
        await doListComplete(0, 3).then(({ items }) => {
            expect(items.length).toBe(9)
            expect(items[0].detail).toBe("Emmet Abbreviation")
            items.slice(1).forEach(item => {
                expect(item.label.slice(0, 4)).toBe("lang")
            })
        })

        await openContentAsTextDocument("div*3+span^br+a>p")
        await doListComplete(0, 17).then(({ items }) => {
            expect(items.length).toBe(12)

            items.forEach((item, index) => {
                if (index >= 4) {
                    expect(item.label.slice(0, 4)).toBe("lang")
                } else {
                    expect(item.detail).toBe("Emmet Abbreviation")
                }
            })
        })
    })

    test("whether emmet is avaliable in any text content section.", async () => {
        await openContentAsTextDocument("<div>div")
        await doListComplete(0, 8).then(({ items }) => {
            expect(items.length).toBe(1)
            expect(items[0].detail).toBe("Emmet Abbreviation")
        })

        await openContentAsTextDocument(
            formatSourceCode(`
                <div>
                    <input>span
            `)
        )
        await doListComplete(1, 15).then(({ items }) => {
            expect(items.length).toBe(1)
            expect(items[0].detail).toBe("Emmet Abbreviation")
        })

        await openContentAsTextDocument(
            formatSourceCode(`
                <div>
                    <i></i>a
                </div>
            `)
        )
        await doListComplete(1, 12).then(({ items }) => {
            expect(items.length).toBe(8)
            items.forEach(item => {
                expect(item.detail).toBe("Emmet Abbreviation")
            })
        })
    })
})

describe("Html character entity completions:", () => {
    const assertCompletionsLen = (completions: CompletionItem[] | undefined) => {
        expect(completions?.length).toBe(2125)
    }

    it("should receive all entity suggestion items in response.", async () => {
        await openContentAsTextDocument("&")
        await doComplete(0, 1, "&").then(completions => {
            assertCompletionsLen(completions)
            completions?.forEach(item => {
                assertTextEditRange(item, 0, 0, 0, 1)
                expect(item.textEdit?.newText[0]).toBe("&")
            })
        })
    })

    it("should receive all entity suggestion items with the range(0, 1 - 0, 8) in response.", async () => {
        await openContentAsTextDocument("a&aacute")
        await doComplete(0, 8).then(completions => {
            assertCompletionsLen(completions)
            completions?.forEach(item => {
                assertTextEditRange(item, 0, 1, 0, 8)
                expect(item.textEdit?.newText[0]).toBe("&")
            })
        })
    })

    it("should receive all entity suggestion items with special range to replace the existing entity item.", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                &LT
                ___&equals;___
            `)
        )

        await Promise.all([
            doComplete(0, 2).then(completions => {
                assertCompletionsLen(completions)
                completions?.forEach(item => {
                    assertTextEditRange(item, 0, 0, 0, 3)
                    expect(item.textEdit?.newText[0]).toBe("&")
                })
            }),
            doComplete(1, 8).then(completions => {
                assertCompletionsLen(completions)
                completions?.forEach(item => {
                    assertTextEditRange(item, 1, 3, 1, 11)
                    expect(item.textEdit?.newText[0]).toBe("&")
                })
            })
        ])
    })

    test("whether entity completion suggestion functions is valid in text content section of any tag.", async () => {
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
                assertCompletionsLen(completions)
                completions?.forEach(item => {
                    assertTextEditRange(item, 0, 8, 0, 11)
                    expect(item.textEdit?.newText[0]).toBe("&")
                })
            }),
            doComplete(3, 15).then(completions => {
                assertCompletionsLen(completions)
                completions?.forEach(item => {
                    assertTextEditRange(item, 3, 11, 3, 15)
                    expect(item.textEdit?.newText[0]).toBe("&")
                })
            }),
            doComplete(7, 3).then(completions => {
                assertCompletionsLen(completions)
                completions?.forEach(item => {
                    assertTextEditRange(item, 7, 0, 7, 3)
                    expect(item.textEdit?.newText[0]).toBe("&")
                })
            }),
            doComplete(7, 13).then(completions => {
                assertCompletionsLen(completions)
                completions?.forEach(item => {
                    assertTextEditRange(item, 7, 10, 7, 13)
                    expect(item.textEdit?.newText[0]).toBe("&")
                })
            })
        ])
    })

    test("whether entity completion suggestion functions is valid in attribute value section of any tag.", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                <div class="&">
                    <input value="&quot"
            `)
        )
        await Promise.all([
            doComplete(0, 13).then(completions => {
                assertCompletionsLen(completions)
                completions?.forEach(item => {
                    assertTextEditRange(item, 0, 12, 0, 13)
                    expect(item.textEdit?.newText[0]).toBe("&")
                })
            }),
            doComplete(1, 23).then(completions => {
                assertCompletionsLen(completions)
                completions?.forEach(item => {
                    assertTextEditRange(item, 1, 18, 1, 23)
                    expect(item.textEdit?.newText[0]).toBe("&")
                })
            }),
            doComplete(1, 19).then(completions => {
                assertCompletionsLen(completions)
                completions?.forEach(item => {
                    assertTextEditRange(item, 1, 18, 1, 23)
                    expect(item.textEdit?.newText[0]).toBe("&")
                })
            })
        ])
    })
})

describe("Html Attribute name completions:", () => {
    const assertSuggestCommand = (item: CompletionItem) => {
        expect(item.command?.title).toBe("suggest")
        expect(item.command?.command).toBe("editor.action.triggerSuggest")
    }

    it("should receive all normal attribute name completion suggestions in response.", async () => {
        await openContentAsTextDocument("<div cla")
        await doComplete(0, 8).then(completions => {
            completions?.forEach(item => {
                if (item.label === "aria-live") {
                    assertSuggestCommand(item)
                }
                if (item.label === "class") {
                    expect(item.textEdit?.newText).toBe('class="$0"')
                }
                assertTextEditRange(item, 0, 5, 0, 8)
            })
            expect(completions?.length).toBe(161)
        })

        await openContentAsTextDocument(
            formatSourceCode(`
                <div>
                    <input va
            `)
        )
        await doComplete(1, 13).then(completions => {
            completions?.forEach(item => {
                if (item.label === "type") {
                    assertSuggestCommand(item)
                }
                if (item.label === "value") {
                    expect(item.textEdit?.newText).toBe('value="$0"')
                }
                assertTextEditRange(item, 1, 11, 1, 13)
            })
            expect(completions?.length).toBe(193)
        })
    })

    it("should receive all dynamic attribute name completion suggestions in response.", async () => {
        await openContentAsTextDocument("<div !></div>")
        await doComplete(0, 6).then(completions => {
            completions?.forEach(item => {
                if (item.label === "class") {
                    expect(item.textEdit?.newText).toBe("class={$0}")
                }
                expect(item.command).toBeUndefined()
                assertTextEditRange(item, 0, 5, 0, 6)
            })
            expect(completions?.length).toBe(143)
        })

        await openContentAsTextDocument(
            formatSourceCode(`
                <div !id={a}!cla>
                    <input !va
                </div>
            `)
        )
        await Promise.all([
            doComplete(0, 8).then(completions => {
                completions?.forEach(item => {
                    if (item.label === "!id") {
                        expect(item.textEdit?.newText).toBe("!id")
                    }
                    expect(item.command).toBeUndefined()
                    assertTextEditRange(item, 0, 5, 0, 8)
                })
                expect(completions?.length).toBe(143)
            }),
            doComplete(0, 16).then(completions => {
                completions?.forEach(item => {
                    if (item.label === "!class") {
                        expect(item.textEdit?.newText).toBe("!class={$0}")
                    }
                    expect(item.command).toBeUndefined()
                    assertTextEditRange(item, 0, 12, 0, 16)
                })
                expect(completions?.length).toBe(143)
            }),
            doComplete(1, 14).then(completions => {
                completions?.forEach(item => {
                    if (item.label === "!value") {
                        expect(item.textEdit?.newText).toBe("!value={$0}")
                    }
                    expect(item.command).toBeUndefined()
                    assertTextEditRange(item, 1, 11, 1, 14)
                })
                expect(completions?.length).toBe(175)
            })
        ])
    })

    it("should receive all event handler name completion suggestions in response.", async () => {
        await openContentAsTextDocument("<div @")
        await doComplete(0, 6).then(completions => {
            completions?.forEach(item => {
                expect(item.command).toBeUndefined()
                assertTextEditRange(item, 0, 5, 0, 6)
                expect(item.textEdit?.newText[0]).toBe("@")
                expect(item.textEdit?.newText).toBe(`${item.label}={$0}`)
            })
            expect(completions?.length).toBe(68)
        })

        await openContentAsTextDocument(
            formatSourceCode(`
                <div @click={handleClick}@>
                    <input @inp
            `)
        )
        await Promise.all([
            doComplete(0, 11).then(completions => {
                completions?.forEach(item => {
                    expect(item.command).toBeUndefined()
                    assertTextEditRange(item, 0, 5, 0, 11)
                    expect(item.textEdit?.newText[0]).toBe("@")
                    expect(item.textEdit?.newText).toBe(item.label)
                })
                expect(completions?.length).toBe(68)
            }),
            doComplete(0, 26).then(completions => {
                completions?.forEach(item => {
                    expect(item.command).toBeUndefined()
                    assertTextEditRange(item, 0, 25, 0, 26)
                    expect(item.textEdit?.newText[0]).toBe("@")
                    expect(item.textEdit?.newText).toBe(`${item.label}={$0}`)
                })
                expect(completions?.length).toBe(68)
            }),
            doComplete(1, 15).then(completions => {
                completions?.forEach(item => {
                    expect(item.command).toBeUndefined()
                    assertTextEditRange(item, 1, 11, 1, 15)
                    expect(item.textEdit?.newText[0]).toBe("@")
                    expect(item.textEdit?.newText).toBe(`${item.label}={$0}`)
                })
                expect(completions?.length).toBe(68)
            })
        ])
    })

    it("should receive all directive name completion suggetions in response.", async () => {
        await openContentAsTextDocument("<div #")
        await doComplete(0, 6).then(completions => {
            completions?.forEach(item => {
                expect(item.command).toBeUndefined()
                assertTextEditRange(item, 0, 5, 0, 6)
                expect(item.textEdit?.newText).toBe(`${item.label}={$0}`)
            })
            expect(completions?.length).toBe(18)
        })

        await openContentAsTextDocument("<div #for={3}#></div>")
        await Promise.all([
            doComplete(0, 9).then(completions => {
                completions?.forEach(item => {
                    expect(item.command).toBeUndefined()
                    assertTextEditRange(item, 0, 5, 0, 9)
                    expect(item.textEdit?.newText).toBe(`${item.label}`)
                })
            }),
            doComplete(0, 14).then(completions => {
                completions?.forEach(item => {
                    expect(item.command).toBeUndefined()
                    assertTextEditRange(item, 0, 13, 0, 14)
                    expect(item.textEdit?.newText).toBe(`${item.label}={$0}`)
                })
            })
        ])
    })

    it.only("should receive corresponding reference attribute name completion suggestions in response.", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                <input &>
                <input type="text" &>
                <input type="radio" &>
                <input type="checkbox" &>
                <select &></select>
                <select multiple &></select>
            `)
        )

        await Promise.all([
            doComplete(0, 8).then(completions => {
                expect(completions?.length).toBe(1)
                expect(completions![0].label).toBe("&value")
            }),
            doComplete(1, 20).then(completions => {
                expect(completions?.length).toBe(1)
                expect(completions![0].label).toBe("&value")
            }),
            doComplete(4, 9).then(completions => {
                expect(completions?.length).toBe(1)
                expect(completions![0].label).toBe("&value")
            }),
            doComplete(5, 18).then(completions => {
                expect(completions?.length).toBe(1)
                expect(completions![0].label).toBe("&value")
            }),
            doComplete(2, 21).then(completions => {
                expect(completions?.length).toBe(2)
                expect(completions!.map(item => item.label)).toEqual(["&checked", "&group"])
            }),
            doComplete(3, 24).then(completions => {
                expect(completions?.length).toBe(2)
                expect(completions!.map(item => item.label)).toEqual(["&checked", "&group"])
            })
        ])
    })
})

describe("Html attribute value completions:", () => {
    it("should receive all recommended attribute value completion suggestions in response.", async () => {
        await openContentAsTextDocument(`<input type=""`)
        await doComplete(0, 13).then(completions => {
            completions?.forEach(item => {
                assertTextEditRange(item, 0, 13, 0, 13)
            })
            expect(completions?.length).toBe(23)
        })
    })

    it("should not receive any recommended attribute value completion suggestion in response.", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                <div class="">
                    <input !value={} @input={} #if={}>
                </div value="">
            `)
        )
        await Promise.all([
            doComplete(0, 12).then(res => expect(res).toBeNull()),
            doComplete(1, 19).then(res => expect(res).toBeNull()),
            doComplete(1, 29).then(res => expect(res).toBeNull()),
            doComplete(1, 36).then(res => expect(res).toBeNull())
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
export async function doComplete(line: number, character: number, triggerChar?: string) {
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

// 此方法用于将doComplete方法的结果断言为CompletionList
async function doListComplete(...args: Parameters<typeof doComplete>) {
    return doComplete(...args) as any as CompletionList
}
