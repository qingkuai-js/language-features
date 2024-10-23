import type { TextEdit, CompletionItem, CompletionParams } from "vscode-languageserver/node"

import { connection } from "./index.test"
import { isUndefined } from "../shared-util/assert"
import { describe, expect, it, test } from "vitest"
import { assertRange, formatSourceCode, openContentAsTextDocument } from "../shared-util/tests"

describe("Emmet functions:", () => {
    test("whether emmet syntax is avaliable.", async () => {
        await openContentAsTextDocument("div")
        await doComplete(0, 3).then(completions => {
            const completionsLen = completions?.length || 0
            completions?.slice(0, -1).forEach((item, index) => {
                if (completionsLen !== index + 1) {
                    expect(item.label.slice(0, 4)).toBe("lang")
                } else {
                    expect(item.detail).toBe("Emmet Abbreviation")
                }
            })
            expect(completionsLen).toBe(9)
        })

        await openContentAsTextDocument("div*3+span^br+a>p")
        await doComplete(0, 17).then(completions => {
            const completionsLen = completions?.length || 0
            completions?.forEach((item, index) => {
                if (index < 8) {
                    expect(item.label.slice(0, 4)).toBe("lang")
                } else {
                    expect(item.detail).toBe("Emmet Abbreviation")
                }
            })
            expect(completionsLen).toBe(12)
        })
    })

    test("whether emmet is avaliable in any text content section.", async () => {
        await openContentAsTextDocument("<div>div")
        await doComplete(0, 8).then(completions => {
            expect(completions?.length).toBe(1)
            expect(completions?.[0].detail).toBe("Emmet Abbreviation")
        })

        await openContentAsTextDocument(
            formatSourceCode(`
                <div>
                    <input>span
            `)
        )
        await doComplete(1, 15).then(completions => {
            expect(completions?.length).toBe(1)
            expect(completions?.[0].detail).toBe("Emmet Abbreviation")
        })

        await openContentAsTextDocument(
            formatSourceCode(`
                <div>
                    <i></i>a
                </div>
            `)
        )
        await doComplete(1, 12).then(completions => {
            expect(completions?.length).toBe(8)
            completions?.forEach(item => {
                expect(item.detail).toBe("Emmet Abbreviation")
            })
        })
    })

    test("whether emmet is avaliable for special attribute(dynamic/reference attribute, directive name or event name).", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                div[!class=expression]
                input[-type &value=inpValue]
                div[#for="item, index in arr"]
                span[!class &value #for @keyup|stop|once]
                div[@click="()=>{console.log(expression)}"]
            `)
        )

        await doComplete(0, 22).then(completions => {
            expect(completions?.[0].documentation).toBe("<div !class={expression}>|</div>")
            expect(completions?.[0].textEdit?.newText).toBe("<div !class={expression}>${0}</div>")
        })

        await doComplete(1, 28).then(completions => {
            expect(completions?.[0].documentation).toBe("<input &value={inpValue}>")
            expect(completions?.[0].textEdit?.newText).toBe("<input &value={inpValue}>")
        })

        await doComplete(2, 31).then(completions => {
            expect(completions?.[0].documentation).toBe("<div #for={item, index in arr}>|</div>")
            expect(completions?.[0].textEdit?.newText).toBe(
                "<div #for={item, index in arr}>${0}</div>"
            )
        })

        await doComplete(3, 42).then(completions => {
            expect(completions?.[0].documentation).toBe(
                "<span !class={|} &value={|} #for={|} @keyup|stop|once={|}>|</span>"
            )
            expect(completions?.[0].textEdit?.newText).toBe(
                "<span !class={${1}} &value={${2}} #for={${3}} @keyup|stop|once={${4}}>${0}</span>"
            )
        })

        await doComplete(4, 44).then(completions => {
            expect(completions?.[0].documentation).toBe(
                "<div @click={()=>{console.log(expression)}}>|</div>"
            )
            expect(completions?.[0].textEdit?.newText).toBe(
                "<div @click={()=>{console.log(expression)}}>${0}</div>"
            )
        })
    })
})

describe("Html character entity completions:", () => {
    it("should receive all entity suggestion items in response.", async () => {
        await openContentAsTextDocument("&")
        await doComplete(0, 1, "&").then(completions => {
            expect(completions?.length).toBe(2125)
            completions?.forEach(item => {
                expect(item.textEdit?.newText[0]).toBe("&")
                assertRange(item?.textEdit?.range, 0, 0, 0, 1)
            })
        })
    })

    it("should receive all entity suggestion items with the range(0, 1 - 0, 8) in response.", async () => {
        await openContentAsTextDocument("a&aacute")
        await doComplete(0, 8).then(completions => {
            expect(completions?.length).toBe(2133)
            completions?.slice(0, -8).forEach(item => {
                expect(item.textEdit?.newText[0]).toBe("&")
                assertRange(item.textEdit?.range, 0, 1, 0, 8)
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
                expect(completions?.length).toBe(2130)
                completions?.slice(0, -5).forEach(item => {
                    expect(item.textEdit?.newText[0]).toBe("&")
                    assertRange(item.textEdit?.range, 0, 0, 0, 3)
                })
            }),
            doComplete(1, 8).then(completions => {
                expect(completions?.length).toBe(2133)
                completions?.slice(0, -8).forEach(item => {
                    expect(item.textEdit?.newText[0]).toBe("&")
                    assertRange(item.textEdit?.range, 1, 3, 1, 11)
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
                expect(completions?.length).toBe(2125)
                completions?.forEach(item => {
                    expect(item.textEdit?.newText[0]).toBe("&")
                    assertRange(item.textEdit?.range, 0, 8, 0, 11)
                })
            }),
            doComplete(3, 15).then(completions => {
                expect(completions?.length).toBe(2125)
                completions?.forEach(item => {
                    expect(item.textEdit?.newText[0]).toBe("&")
                    assertRange(item.textEdit?.range, 3, 11, 3, 15)
                })
            }),
            doComplete(7, 3).then(completions => {
                expect(completions?.length).toBe(2133)
                completions?.slice(0, -8).forEach(item => {
                    expect(item.textEdit?.newText[0]).toBe("&")
                    assertRange(item.textEdit?.range, 7, 0, 7, 3)
                })
            }),
            doComplete(7, 13).then(completions => {
                expect(completions?.length).toBe(2133)
                completions?.slice(0, -8).forEach(item => {
                    expect(item.textEdit?.newText[0]).toBe("&")
                    assertRange(item.textEdit?.range, 7, 10, 7, 13)
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
                expect(completions?.length).toBe(2125)
                completions?.forEach(item => {
                    expect(item.textEdit?.newText[0]).toBe("&")
                    assertRange(item.textEdit?.range, 0, 12, 0, 13)
                })
            }),
            doComplete(1, 23).then(completions => {
                expect(completions?.length).toBe(2125)
                completions?.forEach(item => {
                    expect(item.textEdit?.newText[0]).toBe("&")
                    assertRange(item.textEdit?.range, 1, 18, 1, 23)
                })
            }),
            doComplete(1, 19).then(completions => {
                expect(completions?.length).toBe(2125)
                completions?.forEach(item => {
                    expect(item.textEdit?.newText[0]).toBe("&")
                    assertRange(item.textEdit?.range, 1, 18, 1, 23)
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
                assertRange(item.textEdit?.range, 0, 5, 0, 8)
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
                assertRange(item.textEdit?.range, 1, 11, 1, 13)
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
                assertRange(item.textEdit?.range, 0, 5, 0, 6)
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
                    assertRange(item.textEdit?.range, 0, 5, 0, 8)
                })
                expect(completions?.length).toBe(143)
            }),
            doComplete(0, 16).then(completions => {
                completions?.forEach(item => {
                    if (item.label === "!class") {
                        expect(item.textEdit?.newText).toBe("!class={$0}")
                    }
                    expect(item.command).toBeUndefined()
                    assertRange(item.textEdit?.range, 0, 12, 0, 16)
                })
                expect(completions?.length).toBe(143)
            }),
            doComplete(1, 14).then(completions => {
                completions?.forEach(item => {
                    if (item.label === "!value") {
                        expect(item.textEdit?.newText).toBe("!value={$0}")
                    }
                    expect(item.command).toBeUndefined()
                    assertRange(item.textEdit?.range, 1, 11, 1, 14)
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
                assertRange(item.textEdit?.range, 0, 5, 0, 6)
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
                    assertRange(item.textEdit?.range, 0, 5, 0, 11)
                    expect(item.textEdit?.newText[0]).toBe("@")
                    expect(item.textEdit?.newText).toBe(item.label)
                })
                expect(completions?.length).toBe(68)
            }),
            doComplete(0, 26).then(completions => {
                completions?.forEach(item => {
                    expect(item.command).toBeUndefined()
                    assertRange(item.textEdit?.range, 0, 25, 0, 26)
                    expect(item.textEdit?.newText[0]).toBe("@")
                    expect(item.textEdit?.newText).toBe(`${item.label}={$0}`)
                })
                expect(completions?.length).toBe(68)
            }),
            doComplete(1, 15).then(completions => {
                completions?.forEach(item => {
                    expect(item.command).toBeUndefined()
                    assertRange(item.textEdit?.range, 1, 11, 1, 15)
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
                assertRange(item.textEdit?.range, 0, 5, 0, 6)
                expect(item.textEdit?.newText).toBe(`${item.label}={$0}`)
            })
            expect(completions?.length).toBe(18)
        })

        await openContentAsTextDocument("<div #for={3}#></div>")
        await Promise.all([
            doComplete(0, 9).then(completions => {
                completions?.forEach(item => {
                    expect(item.command).toBeUndefined()
                    assertRange(item.textEdit?.range, 0, 5, 0, 9)
                    expect(item.textEdit?.newText).toBe(`${item.label}`)
                })
            }),
            doComplete(0, 14).then(completions => {
                completions?.forEach(item => {
                    expect(item.command).toBeUndefined()
                    assertRange(item.textEdit?.range, 0, 13, 0, 14)
                    expect(item.textEdit?.newText).toBe(`${item.label}={$0}`)
                })
            })
        ])
    })

    it("should receive corresponding reference attribute name completion suggestions in response.", async () => {
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

    test("whether event modifier compoletion suggestions response is correct.", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                <div @click|
                <input @input|
                <div @keypress|
                <div @keydown|
                <div @keyup|
            `)
        )

        await Promise.all([
            doComplete(0, 12).then(completions => {
                expect(completions?.length).toBe(9)
            }),
            doComplete(1, 14).then(completions => {
                expect(completions?.length).toBe(10)
            }),
            doComplete(2, 15).then(completions => {
                expect(completions?.length).toBe(19)
            }),
            doComplete(3, 14).then(completions => {
                expect(completions?.length).toBe(19)
            }),
            doComplete(4, 12).then(completions => {
                expect(completions?.length).toBe(19)
            })
        ])
    })

    it("should not receive the existing event modifier completion suggestion in response.", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                <div @click|once|capture|></div>
                <input @input|compose|>
                <div @keyup|compose>
                <div @keyup|enter|>
            `)
        )

        await Promise.all([
            doComplete(0, 14).then(completions => {
                expect(completions?.length).toBe(8)
            }),
            doComplete(0, 25).then(completions => {
                expect(completions?.length).toBe(7)
            }),
            doComplete(1, 22).then(completions => {
                expect(completions?.length).toBe(9)
            }),
            doComplete(2, 19).then(completions => {
                expect(completions?.length).toBe(19)
            }),
            doComplete(3, 17).then(completions => {
                expect(completions?.length).toBe(19)
            }),
            doComplete(3, 18).then(completions => {
                expect(completions?.length).toBe(9)
            })
        ])
    })
})

describe("Html attribute value completions:", () => {
    it("should receive all recommended attribute value completion suggestions in response.", async () => {
        await openContentAsTextDocument(`<input type=""`)
        await doComplete(0, 13).then(completions => {
            completions?.forEach(item => {
                assertRange(item.textEdit?.range, 0, 13, 0, 13)
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

// 此方法用于向qingkuai语言服务器发起textDocument/completion请求
export async function doComplete(line: number, character: number, triggerChar?: string) {
    const ret = await connection.sendRequest("textDocument/completion", {
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
    } satisfies CompletionParams)
    return ret as (CompletionItem & { textEdit?: TextEdit })[] | null
}
