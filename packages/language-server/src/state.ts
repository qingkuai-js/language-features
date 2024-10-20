import type { CachedCompileResultItem } from "./types/service"
import type { Position, TextDocumentIdentifier } from "vscode-languageserver"

import { compile } from "qingkuai/compiler"
import { isUndefined } from "../../../shared-util/assert"
import { TextDocument } from "vscode-languageserver-textdocument"
import { TextDocuments, createConnection, ProposedFeatures } from "vscode-languageserver/node"

export const state = {
    // 在测试环境中运行时，不会请求textDocument/initialize，
    // 此时无需判断文档版本是否未改变，print方法可以为调试信息添加颜色
    isInitialized: false
}

export const documents = new TextDocuments(TextDocument)
export const connection = createConnection(ProposedFeatures.all)

// crc means Compile Result Cache
// 避免多个客户端事件可能会导致频繁编译，crc缓存最新版本的编译结果
export const crc = new Map<string, CachedCompileResultItem>()

// 解析qk源码文件，版本相同时不会重复解析（测试时无需判断，即state.isInitialized === false）
export function getCompileRes({ uri }: TextDocumentIdentifier, position: Position) {
    const document = documents.get(uri)
    if (isUndefined(document)) {
        return undefined
    }

    const cached = crc.get(uri)
    const { version } = document
    const offset = document.offsetAt(position)
    if (!state.isInitialized || version !== cached?.version) {
        const source = document.getText()
        const compileRes = compile(source, {
            componentName: "",
            check: true
        })
        const res: CachedCompileResultItem = {
            source,
            version,
            document,
            ...compileRes,
            getRange(start, end) {
                if (isUndefined(end)) {
                    end = start
                }
                return {
                    start: res.getPosition(start),
                    end: res.getPosition(end)
                }
            },
            getPosition(offset) {
                const position = compileRes.inputDescriptor.positions[offset]
                return {
                    line: position.line - 1,
                    character: position.column
                }
            },
            getOffset: document.offsetAt.bind(document)
        }
        return crc.set(uri, res), res
    }
    return cached
}

connection.listen()
documents.listen(connection)
