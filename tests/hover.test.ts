import type { FixedArray } from "../types/util"
import { Hover, HoverParams, MarkupContent } from "vscode-languageserver/node"

import { connection } from "./index.test"
import { describe, expect, it } from "vitest"
import { MarkupKind } from "vscode-languageserver/node"
import { assertRange, formatSourceCode, openContentAsTextDocument } from "../shared-util/tests"

describe("Html tag hover tip functions:", () => {
    it("should receive html tag hover tip.", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                <div>
                    <p>
                        <input />
                    </p>
                </div>
                <lang-js></lang-js>
            `)
        )

        for (let c = 1; c < 4; c++) {
            await doHover(0, c).then(ret => {
                assertRange(ret.range, 0, 1, 0, 4)
                expect(ret.contents.kind).toBe(MarkupKind.Markdown)
                expect(ret.contents.value.startsWith("The div")).toBe(true)
            })
        }

        await doHover(1, 5).then(ret => {
            assertRange(ret.range, 1, 5, 1, 6)
            expect(ret.contents.kind).toBe(MarkupKind.Markdown)
            expect(ret.contents.value.startsWith("The p")).toBe(true)
        })

        for (let c = 9; c < 14; c++) {
            await doHover(2, c).then(ret => {
                assertRange(ret.range, 2, 9, 2, 14)
                expect(ret.contents.kind).toBe(MarkupKind.Markdown)
                expect(ret.contents.value.slice(0, 9)).toBe("The input")
                expect(ret.contents.value.startsWith("The input")).toBe(true)
            })
        }

        await doHover(3, 6).then(ret => {
            assertRange(ret.range, 3, 6, 3, 7)
            expect(ret.contents.kind).toBe(MarkupKind.Markdown)
            expect(ret.contents.value.startsWith("The p")).toBe(true)
        })

        for (let c = 2; c < 5; c++) {
            await doHover(4, c).then(ret => {
                assertRange(ret.range, 4, 2, 4, 5)
                expect(ret.contents.kind).toBe(MarkupKind.Markdown)
                expect(ret.contents.value.startsWith("The div")).toBe(true)
            })
        }

        for (let c = 1; c < 8; c++) {
            await doHover(5, c).then(ret => {
                assertRange(ret.range, 5, 1, 5, 8)
                expect(ret.contents.kind).toBe(MarkupKind.Markdown)
                expect(ret.contents.value.startsWith("The lang-js")).toBe(true)
            })
        }

        for (let c = 11; c < 18; c++) {
            await doHover(5, c).then(ret => {
                assertRange(ret.range, 5, 11, 5, 18)
                expect(ret.contents.kind).toBe(MarkupKind.Markdown)
                expect(ret.contents.value.startsWith("The lang-js")).toBe(true)
            })
        }
    })

    it("should not receive html tag hover tip.", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                <div>
                    <p>
                        <input />
                    </p>
                </div>
                <lang-js></lang-js>
            `)
        )

        const positions: FixedArray<number, 2>[] = [
            [0, 0],
            [0, 4],
            [0, 5],
            [1, 4],
            [1, 6],
            [1, 7],
            [2, 7],
            [2, 8],
            [2, 14],
            [2, 15],
            [2, 16],
            [3, 3],
            [3, 4],
            [3, 5],
            [3, 7],
            [3, 8],
            [4, 0],
            [4, 1],
            [4, 5],
            [4, 6],
            [5, 0],
            [5, 8],
            [5, 9],
            [5, 10],
            [5, 18],
            [5, 19]
        ]
        for (const position of positions) {
            await doHover(...position).then(ret => {
                expect(ret).toBeNull()
            })
        }
    })
})

describe("Html attribute hover tip functions:", () => {
    it("should receive html attribute hover tip.", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                <div
                    class=
                    !class={}
                    @click={}
                >
                    <br hidden>
                </div>
            `)
        )

        for (let c = 4; c < 9; c++) {
            await doHover(1, c).then(ret => {
                assertRange(ret.range, 1, 4, 1, 9)
                expect(ret.contents.kind).toBe(MarkupKind.Markdown)
                expect(ret.contents.value.startsWith("A space-separated")).toBe(true)
            })
        }

        for (let c = 4; c < 10; c++) {
            await doHover(2, c).then(ret => {
                assertRange(ret.range, 2, 4, 2, 10)
                expect(ret.contents.kind).toBe(MarkupKind.Markdown)
                expect(ret.contents.value.startsWith("A space-separated")).toBe(true)
            })
        }

        for (let c = 4; c < 10; c++) {
            await doHover(3, c).then(ret => {
                assertRange(ret.range, 3, 4, 3, 10)
                expect(ret.contents.kind).toBe(MarkupKind.Markdown)
                expect(ret.contents.value.startsWith("A pointing")).toBe(true)
            })
        }

        for (let c = 8; c < 14; c++) {
            await doHover(5, c).then(ret => {
                assertRange(ret.range, 5, 8, 5, 14)
                expect(ret.contents.kind).toBe(MarkupKind.Markdown)
                expect(ret.contents.value.startsWith("A Boolean")).toBe(true)
            })
        }
    })

    it("should not receive html attribute hover tip.", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                <div
                    class=
                    !class={}
                    @click={}
                >
                    <br hidden>
                </div>
            `)
        )

        const positions: FixedArray<number, 2>[] = [
            [1, 3],
            [1, 9],
            [1, 10],
            [2, 3],
            [2, 10],
            [2, 11],
            [3, 3],
            [3, 10],
            [3, 11],
            [5, 7],
            [5, 14],
            [5, 15]
        ]
        for (const position of positions) {
            await doHover(...position).then(ret => {
                expect(ret).toBeNull()
            })
        }
    })
})

describe("Html character entity hover tip functions:", () => {
    it("should receive html character entity hover tip.", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                &lt&gt<div>
                    &quot;
                </div>&amp;
            `)
        )

        for (let c = 0; c < 3; c++) {
            await doHover(0, c).then(ret => {
                assertRange(ret.range, 0, 0, 0, 3)
                expect(ret.contents.kind).toBe(MarkupKind.Markdown)
                expect(ret.contents.value.startsWith("Character entity representing: <")).toBe(true)
            })
        }

        for (let c = 3; c < 6; c++) {
            await doHover(0, c).then(ret => {
                assertRange(ret.range, 0, 3, 0, 6)
                expect(ret.contents.kind).toBe(MarkupKind.Markdown)
                expect(ret.contents.value.startsWith("Character entity representing: >")).toBe(true)
            })
        }

        for (let c = 4; c < 10; c++) {
            await doHover(1, c).then(ret => {
                assertRange(ret.range, 1, 4, 1, 10)
                expect(ret.contents.kind).toBe(MarkupKind.Markdown)
                expect(ret.contents.value.startsWith('Character entity representing: "')).toBe(true)
            })
        }

        for (let c = 6; c < 11; c++) {
            await doHover(2, c).then(ret => {
                assertRange(ret.range, 2, 6, 2, 11)
                expect(ret.contents.kind).toBe(MarkupKind.Markdown)
                expect(ret.contents.value.startsWith("Character entity representing: &")).toBe(true)
            })
        }
    })

    it("should not receive html character entity hover tip.", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                &lt&gt<div>
                    &quot;
                </div>&amp;
            `)
        )

        const positions: FixedArray<number, 2>[] = [
            [0, 6],
            [1, 3],
            [2, 5]
        ]
        for (const position of positions) {
            await doHover(...position).then(ret => {
                expect(ret).toBeNull()
            })
        }
    })
})

// 此方法用于向qingkuai语言服务器发起textDocument/hover请求
async function doHover(line: number, character: number) {
    return (await connection.sendRequest("textDocument/hover", {
        textDocument: {
            uri: ""
        },
        position: {
            line,
            character
        }
    } satisfies HoverParams)) as Hover & {
        contents: MarkupContent
    }
}
