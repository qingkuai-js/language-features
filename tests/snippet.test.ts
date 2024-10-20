import type { InsertSnippetParam } from "../types/server"

import { connection } from "./index.test"
import { doComplete } from "./complete.test"
import { assert, describe, expect, it } from "vitest"
import { formatSourceCode, openContentAsTextDocument } from "../shared-util/tests"

// 此变量用于存储assertSnippetItem方法中Promise的resolve参数，当接收到qingkuai语言服务器的
// 插入片段响应后就会调用它并传入接收到的值，之后assertSnippetItem会判断接受到的值是否与期望相符
let resolver: (value: InsertSnippetParam) => void

describe("Html tag auto close functions:", () => {
    it("should insert close tag automatically", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                <div>
                <span>
                <Component>
            `)
        )

        // doComplete方法产生的Promise在成功响应后才会解决，所以这里不能单独await它这样可能会导致插入片段的
        // onNotification在completion响应前执行，这种情况下插入片段的onNotification中的resolver是不正确的
        await Promise.all([
            doComplete(0, 5).then(completions => {
                expect(completions).toBeNull()
            }),
            assertSnippetItem({ text: "$0</div>" })
        ])

        await Promise.all([
            doComplete(1, 6).then(completions => {
                expect(completions).toBeNull()
            }),
            assertSnippetItem({ text: "$0</span>" })
        ])

        await Promise.all([
            doComplete(2, 11).then(completions => {
                expect(completions).toBeNull()
            }),
            assertSnippetItem({ text: "$0</Component>" })
        ])
    })

    it("should not insert close tag", async () => {
        // resolver没有改变就表示没有收到插入片段的通知
        const oriResolver = resolver

        await openContentAsTextDocument(
            formatSourceCode(`
                <input>
                <input/>
                <Component/>
                <div>
                    <input>
            `)
        )

        await doComplete(0, 7).then(completions => {
            expect(completions).toBeNull()
        })
        expect(resolver).toBe(oriResolver)

        await doComplete(1, 8).then(completions => {
            expect(completions).toBeNull()
        })
        expect(resolver).toBe(oriResolver)

        await doComplete(2, 12).then(completions => {
            expect(completions).toBeNull()
        })
        expect(resolver).toBe(oriResolver)

        await doComplete(4, 11).then(completions => {
            expect(completions).toBeNull()
        })
        expect(resolver).toBe(oriResolver)
    })
})

describe("Html attribute value auto quote functions:", () => {
    it("should insert doubule quotation when entering equal sign.", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                <div class= aria-live=></div>
            `)
        )

        await Promise.all([
            doComplete(0, 11).then(completions => {
                expect(completions).toBeNull()
            }),
            assertSnippetItem({ text: '"$0"' })
        ])

        await Promise.all([
            doComplete(0, 22).then(completions => {
                expect(completions).toBeNull()
            }),
            assertSnippetItem({ text: '"$0"', command: "editor.action.triggerSuggest" })
        ])
    })

    it("should insert a pair of curly bracket when entring equal sign.", async () => {
        await openContentAsTextDocument(
            formatSourceCode(`
                <div #for= !class= @click=>
                    <input &value=>
            `)
        )

        await Promise.all([
            doComplete(0, 10).then(completions => {
                expect(completions).toBeNull()
            }),
            assertSnippetItem({ text: "{$0}" })
        ])

        await Promise.all([
            doComplete(0, 18).then(completions => {
                expect(completions).toBeNull()
            }),
            assertSnippetItem({ text: "{$0}" })
        ])

        await Promise.all([
            doComplete(0, 26).then(completions => {
                expect(completions).toBeNull()
            }),
            assertSnippetItem({ text: "{$0}" })
        ])

        await Promise.all([
            doComplete(1, 18).then(completions => {
                expect(completions).toBeNull()
            }),
            assertSnippetItem({ text: "{$0}" })
        ])
    })
})

connection.onNotification("qingkuai/insertSnippet", item => {
    resolver(item)
})

// 断言qingkuai语言服务器是否响应了期望的插入片段结构，此方法有超时机制，1000ms内未收到通知则断言失败
async function assertSnippetItem(expectItem: InsertSnippetParam) {
    const receivedItem = await new Promise<InsertSnippetParam>(resolve => {
        const timeout = setTimeout(() => {
            resolve(assertSnippetItem as any)
            assert.fail("No insert snippet item has been received")
        }, 1000)
        resolver = (item: InsertSnippetParam) => {
            resolve(item)
            clearTimeout(timeout)
        }
    })

    // @ts-ignore
    // 当接收到的值是此方法本身是为超时的情况，语言服务器不可能返回此方法本身
    if (receivedItem !== assertSnippetItem) {
        expect(expectItem).toEqual(receivedItem)
    }
}
