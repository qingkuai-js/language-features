import type { UpdateSnapshot } from "../../../../types/communication"

import { fileURLToPath } from "url"
import { documents, getCompileRes, tpic } from "../state"
import { defaultParticipant } from "../../../../shared-util/ipc"

// 此集合存储qingkuai语言服务器与typscript-qingkuai-plugin的ipc服务器建立
// 连接前所有被打开的文档uri，当成功建立连接后会更新这些文档的中间代码到插件快照
export const waitingUris = new Set<string>()

// 将编译后的中间代码存储到typescript-qingkuai-plugin中的快照
export function updateQingKuaiSnapshot(uri: string, code: string) {
    tpic.sendNotification<UpdateSnapshot>("updateSnapshot", {
        uri: fileURLToPath(uri),
        code
    })
}

// qk文件修改后同步获取编译后的中间代码
documents.onDidChangeContent(({ document }) => {
    if (tpic === defaultParticipant) {
        waitingUris.add(document.uri)
        return
    }

    const { code } = getCompileRes(document)!
    updateQingKuaiSnapshot(document.uri, code)
})
