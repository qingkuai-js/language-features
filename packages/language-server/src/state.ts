import type { CachedCompileResultItem } from "./types/service"
import type { TextDocumentIdentifier } from "vscode-languageserver"

import { compile } from "qingkuai/compiler"
import { isUndefined } from "../../../shared-util/assert"
import { createLogger, inspect } from "../../../shared-util/log"
import { TextDocument } from "vscode-languageserver-textdocument"
import { connectTo, defaultClient } from "../../../shared-util/ipc/client"
import { TextDocuments, createConnection, ProposedFeatures } from "vscode-languageserver/node"

export const state = {
    // 在测试环境中运行时，不会请求textDocument/initialize，测试环境下需要一些
    // 特殊处理，例如：无需判断文档版本是否未改变，inspect方法可以为调试信息添加颜色等
    isTestingEnv: false
}

export let tsPluginClient = defaultClient

export const Logger = createLogger(console)
export const documents = new TextDocuments(TextDocument)
export const connection = createConnection(ProposedFeatures.all)

// crc means Compile Result Cache
// 避免多个客户端事件可能会导致频繁编译，crc缓存最新版本的编译结果
export const crc = new Map<string, CachedCompileResultItem>()

// 以检查模式解析qk源码文件，版本相同时不会重复解析（测试时无需判断）
export function getCompileRes({ uri }: TextDocumentIdentifier) {
    const document = documents.get(uri)
    if (isUndefined(document)) {
        return undefined
    }

    const cached = crc.get(uri)
    const { version } = document
    if (!state.isTestingEnv || version !== cached?.version) {
        const source = document.getText()
        const compileRes = compile(source, {
            check: true,
            componentName: ""
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

// 连接到qingkuai-typescript-plugin服务器，将客户端记录到tsPluginClient，
// 后续qingkuai语言服务器将通过此客户端与vscode内置的typescript语言服务进行通信
// 此方法还会创建接收qingkuai-typescript-plugin调试日志的处理方法并通过Logger输出
export async function connectToTypescriptPluginServer() {
    const client = await connectTo("qingkuai")
    const kinds = ["info", "warn", "error"] as const
    kinds.forEach(kind => {
        client.onMessage(`log/${kind}`, (msg: string) => {
            Logger[kind](`From typescript-qingkuai-plugin: ${inspect(msg)}`)
        })
    })
    tsPluginClient = client
}

connection.listen()
documents.listen(connection)
