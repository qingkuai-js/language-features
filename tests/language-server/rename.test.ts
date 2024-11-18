import type { FixedArray } from "../../types/util"
import type { Range, WorkspaceEdit, RenameParams, PrepareRenameParams } from "vscode-languageserver"

import {
    assertRange,
    createRange,
    formatSourceCode,
    openContentAsTextDocument
} from "../../shared-util/tests"
import { connection } from "./index.test"
import { describe, expect, it } from "vitest"
import { TextEdit } from "vscode-languageserver/node"

describe("Html tag renaming functions:", () => {
    it("should rename the html tag(include start tag an end tag).", async () => {
        let exp: WorkspaceEdit

        await openContentAsTextDocument(
            formatSourceCode(`
                <div
                    id="header"
                    class="container"
                >
                    xxx...
                    <span>
                        <i></i>
                    </span>
                </div>
                <custom-element>
                    <input >
                </custom-element>
            `)
        )

        exp = {
            changes: {
                "": [
                    TextEdit.replace(createRange(0, 1, 0, 4), "p"),
                    TextEdit.replace(createRange(8, 2, 8, 5), "p")
                ]
            }
        }
        for (let c = 1; c <= 4; c++) {
            await prepareRename(0, c).then(ret => {
                assertRange(ret, 0, 1, 0, 4)
            })
            await rename(0, c, "p").then(ret => {
                expect(ret).toEqual(exp)
            })
        }
        for (let c = 2; c <= 5; c++) {
            await prepareRename(8, c).then(ret => {
                assertRange(ret, 8, 2, 8, 5)
            })
            await rename(8, c, "p").then(ret => {
                expect(ret).toEqual(exp)
            })
        }

        exp = {
            changes: {
                "": [
                    TextEdit.replace(createRange(5, 5, 5, 9), "div"),
                    TextEdit.replace(createRange(7, 6, 7, 10), "div")
                ]
            }
        }
        for (let c = 5; c <= 8; c++) {
            await prepareRename(5, c).then(ret => {
                assertRange(ret, 5, 5, 5, 9)
            })
            await rename(5, c, "div").then(ret => {
                expect(ret).toEqual(exp)
            })
        }
        for (let c = 6; c <= 9; c++) {
            await prepareRename(7, c).then(ret => {
                assertRange(ret, 7, 6, 7, 10)
            })
            await rename(7, c, "div").then(ret => {
                expect(ret).toEqual(exp)
            })
        }

        exp = {
            changes: {
                "": [
                    TextEdit.replace(createRange(6, 9, 6, 10), "div"),
                    TextEdit.replace(createRange(6, 13, 6, 14), "div")
                ]
            }
        }
        for (let c = 9; c <= 10; c++) {
            await prepareRename(6, c).then(ret => {
                assertRange(ret, 6, 9, 6, 10)
            })
            await rename(6, c, "div").then(ret => {
                expect(ret).toEqual(exp)
            })
        }
        for (let c = 13; c <= 14; c++) {
            await prepareRename(6, c).then(ret => {
                assertRange(ret, 6, 13, 6, 14)
            })
            await rename(6, c, "div").then(ret => {
                expect(ret).toEqual(exp)
            })
        }

        exp = {
            changes: {
                "": [
                    TextEdit.replace(createRange(9, 1, 9, 15), "div"),
                    TextEdit.replace(createRange(11, 2, 11, 16), "div")
                ]
            }
        }
        for (let c = 1; c <= 15; c++) {
            await prepareRename(9, c).then(ret => {
                assertRange(ret, 9, 1, 9, 15)
            })
            await rename(9, c, "div").then(ret => {
                expect(ret).toEqual(exp)
            })
        }
        for (let c = 2; c <= 16; c++) {
            await prepareRename(11, c).then(ret => {
                assertRange(ret, 11, 2, 11, 16)
            })
            await rename(11, c, "div").then(ret => {
                expect(ret).toEqual(exp)
            })
        }

        exp = {
            changes: {
                "": [TextEdit.replace(createRange(10, 5, 10, 10), "select")]
            }
        }
        for (let c = 5; c <= 10; c++) {
            await prepareRename(10, c).then(ret => {
                assertRange(ret, 10, 5, 10, 10)
            })
            await rename(10, c, "select").then(ret => {
                expect(ret).toEqual(exp)
            })
        }
    })

    it("should receive null when a position is not in tag range.", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                <div
                    id="header"
                    class="container"
                >
                    xxx...
                    <span>
                        <i></i>
                    </span>
                </div>
            `)
        )

        const positions: FixedArray<number, 2>[] = [
            [0, 0],
            [5, 10],
            [6, 11],
            [6, 12],
            [6, 15],
            [7, 11],
            [8, 0],
            [8, 1],
            [8, 7]
        ]
        const assertPrepareAsNull = async (line: number, character: number) => {
            await prepareRename(line, character).then(ret => {
                expect(ret).toBeNull()
            })
        }
        for (const position of positions) {
            await assertPrepareAsNull(...position)
        }
        for (let c = 0; c < 16; c++) {
            await assertPrepareAsNull(1, c)
        }
        for (let c = 0; c < 22; c++) {
            await assertPrepareAsNull(2, c)
        }
        for (let c = 0; c < 11; c++) {
            await assertPrepareAsNull(4, c)
        }
        for (let c = 0; c < 5; c++) {
            await assertPrepareAsNull(5, c)
        }
        for (let c = 0; c < 5; c++) {
            await assertPrepareAsNull(5, c)
        }
        for (let c = 0; c < 9; c++) {
            await assertPrepareAsNull(6, c)
        }
        for (let c = 0; c < 6; c++) {
            await assertPrepareAsNull(7, c)
        }
    })
})

// 此方法用于向qingkuai语言服务器发起textDocument/prepareRename请求
async function prepareRename(line: number, character: number) {
    return (await connection.sendRequest("textDocument/prepareRename", {
        textDocument: {
            uri: ""
        },
        position: {
            line,
            character
        }
    } satisfies PrepareRenameParams)) as Range
}

// 此方法用于向qingkuai语言服务器发起textDocument/rename请求
async function rename(line: number, character: number, newName: string) {
    return (await connection.sendRequest("textDocument/rename", {
        textDocument: {
            uri: ""
        },
        position: {
            line,
            character
        },
        newName
    } satisfies RenameParams)) as WorkspaceEdit
}
