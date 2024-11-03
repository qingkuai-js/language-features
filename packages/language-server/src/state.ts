import type { CachedCompileResultItem } from "./types/service"
import type { TextDocumentIdentifier } from "vscode-languageserver"

import { compile } from "qingkuai/compiler"
import { createLogger } from "../../../shared-util/log"
import { isUndefined } from "../../../shared-util/assert"
import { TextDocument } from "vscode-languageserver-textdocument"
import { defaultParticipant } from "../../../shared-util/ipc/index"
import { TextDocuments, createConnection, ProposedFeatures } from "vscode-languageserver/node"

export let isTestingEnv = true
export let tpic = defaultParticipant // Typescript Plugin Icp Client

export const setTipc = (v: typeof tpic) => (tpic = v)
export const setIsTestingEnv = (v: boolean) => (isTestingEnv = v)

export const Logger = createLogger(console)
export const documents = new TextDocuments(TextDocument)
export const connection = createConnection(ProposedFeatures.all)

// 避免多个客户端事件可能会导致频繁编译，crc缓存最新版本的编译结果
export const crc = new Map<string, CachedCompileResultItem>() // Compile Result Cache

// 以检查模式解析qk源码文件，版本相同时不会重复解析（测试时无需判断）
export function getCompileRes({ uri }: TextDocumentIdentifier) {
    const document = documents.get(uri)
    if (isUndefined(document)) {
        return undefined
    }

    const cached = crc.get(uri)
    const { version } = document

    // 测试中始终提供最新版本的文档，无需验证文档版本是否发生改变
    if (isTestingEnv || version !== cached?.version) {
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

connection.listen()
documents.listen(connection)
