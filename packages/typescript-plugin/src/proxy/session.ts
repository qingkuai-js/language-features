import type TS from "typescript"

import { tsServerCommandStatus, adapter } from "../state"
import { isQingkuaiFileName } from "../../../../shared-util/assert"

export function proxyExecuteCommand(session: TS.server.Session) {
    const executeCommand = session!.executeCommand
    session!.executeCommand = request => {
        const originalRet = executeCommand.call(session, request)
        tsServerCommandStatus.get(request.command)?.[1]()
        return originalRet
    }
}

// 在查找定义/引用/实现时，返回结果已由 qingkuai-language-service 转换为基于源码的位置
// 后续 typescript 可能通过 toFileSpan 方法获取这写已被转换的位置的源码坐标，导致结果不正确
export function proxyToFileToSpan(session: any) {
    const toFileSpan = session.toFileSpan
    session.toFileSpan = (fileName: string, textSpan: TS.TextSpan, project: TS.server.Project) => {
        if (!isQingkuaiFileName(fileName)) {
            return toFileSpan.call(session, fileName, textSpan, project)
        }

        const fileInfo = adapter.service.ensureGetQingkuaiFileInfo(fileName)
        const startPosition = fileInfo.getPositionByIndex(textSpan.start)
        const endPosition = fileInfo.getPositionByIndex(textSpan.start + textSpan.length)
        return {
            file: fileName,
            start: {
                line: startPosition.line,
                offset: startPosition.column + 1
            },
            end: {
                line: endPosition.line,
                offset: endPosition.column + 1
            }
        } satisfies TS.server.protocol.FileSpan
    }
}
