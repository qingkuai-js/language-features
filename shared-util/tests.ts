import type { FixedArray } from "../types/util"
import type { DidOpenTextDocumentParams, Range } from "vscode-languageserver/node"

import { connection } from "../tests/index.test"
import { expect } from "vitest"
import { isUndefined } from "./assert"

// 将内容作为TextDocument打开并发送通知给语言服务器，此方法打开的文档uri为空字符串
export async function openContentAsTextDocument(content: string) {
    await connection.sendNotification("textDocument/didOpen", {
        textDocument: {
            uri: "",
            version: 0,
            text: content,
            languageId: ""
        }
    } satisfies DidOpenTextDocumentParams)
}

// 由于使用模板字符串(反引号)书写源码时会保留所有空格，这导致在想要书写带有缩进的代码字符串时，
// 字符串内的索引会收到源码文件中缩进层级的影响，或者只能在模板内使用正确的缩进等级，但如果此等级
// 与源码文件中当前位置等级不一致时会导致阅读体验不好
//
// 此方法接受代码文本，并移除第一行的所有前导空格字符，后续其他行会移除与第一行等量的前导空格字符
// 注意：此方法识别代码使用缩进量量的方法为首行空格字符数量（只有一个换行符的行不会被认为是首行）
export function formatSourceCode(code: string) {
    code = code.replace(/^\r?\n*|\r?\n*$/g, "")
    return code.replace(
        new RegExp(`(?:^|\\r?\\n) {${/ *(?=[^ ])/.exec(code)![0].length}}`, "g"),
        matched => {
            return matched.startsWith("\n") ? "\n" : ""
        }
    )
}

// 断言Range结构，多次书写Range比较麻烦，这里只是一个简单的封装，将预期结构使用四个数字类型参数传入
export function assertRange(
    ...[range, sl, sc, el, ec]: [Range | undefined, ...FixedArray<number, 4>]
) {
    expect(range).toEqual<Range>({
        start: { line: sl, character: sc },
        end: { line: el, character: ec }
    })
}

// 由于Range结构书写比较麻烦，此方法通过传入四个数字参数以生成Range结构
export function createRange(...[sl, sc, el, ec]: FixedArray<number, 4>): Range {
    return {
        start: {
            line: sl,
            character: sc
        },
        end: {
            line: el,
            character: ec
        }
    }
}
