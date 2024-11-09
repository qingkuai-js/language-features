import type { CachedCompileResultItem } from "./types/service"
import type { TextDocumentIdentifier } from "vscode-languageserver/node"

import { fileURLToPath } from "url"
import { compile } from "qingkuai/compiler"
import { isUndefined } from "../../../shared-util/assert"
import { getScriptKindKey } from "../../../shared-util/qingkuai"
import { UpdateSnapshotParams } from "../../../types/communication"
import { documents, isTestingEnv, tpic, tpicConnectedPromise, typeRefStatement } from "./state"

// 避免多个客户端事件可能会导致频繁编译，crc缓存最新版本的编译结果
export const crc = new Map<string, CachedCompileResultItem>() // Compile Result Cache

// 以检查模式解析qk源码文件，版本相同时不会重复解析（测试时无需判断）
export async function getCompileRes({ uri }: TextDocumentIdentifier) {
    const document = documents.get(uri)
    if (isUndefined(document)) {
        throw new Error("unknown document: " + uri)
    }

    const cached = crc.get(uri)
    const { version } = document

    // 确保首次编译时机在语言服务器与ts插件成功建立ipc连接后
    // 测试中始终提供最新版本的文档，无需验证文档版本是否发生改变
    if (!isTestingEnv) {
        await tpicConnectedPromise
        if (version === cached?.version) {
            return cached
        }
    }

    const source = document.getText()
    const getOffset = document.offsetAt.bind(document)
    const filePath = isTestingEnv ? uri : fileURLToPath(uri)
    const compileRes = compile(source, { check: true, typeRefStatement })

    // 获取指定开始索引至结束索引的vscode格式范围表达（Range）
    // 如果未传入结束索引，返回的范围固定指向开始位置（Position）
    const getRange = (start: number, end?: number) => {
        if (isUndefined(end)) {
            end = start
        }
        return {
            start: getPosition(start),
            end: getPosition(end)
        }
    }

    // 获取指定索引的vscode格式位置表达（Position）
    const getPosition = (offset: number) => {
        const { positions } = compileRes.inputDescriptor
        return {
            line: positions[offset].line - 1,
            character: positions[offset].column
        }
    }

    // 通过中间代码索引换取源码索引
    const getSourceIndex = (interIndex: number) => {
        return compileRes.interIndexMap.itos[interIndex]
    }

    // 通过源码索引换取中间代码索引
    const getInterIndex = (sourceIndex: number) => {
        return compileRes.interIndexMap.stoi[sourceIndex]
    }

    const ccri: CachedCompileResultItem = {
        ...compileRes,
        source,
        version,
        getRange,
        filePath,
        document,
        getOffset,
        getPosition,
        getInterIndex,
        getSourceIndex
    }

    // 将文件的最新中间代码发送给typescript-qingkuai-plugin(非测试环境)
    if (!isTestingEnv) {
        await tpic.sendRequest<UpdateSnapshotParams>("updateSnapshot", {
            fileName: filePath,
            interCode: ccri.code,
            scriptKindKey: getScriptKindKey(ccri)
        })
    }

    return crc.set(uri, ccri), ccri
}
