import nodeFs from "node:fs"
import nodeNet from "node:net"
import nodeOs from "node:os"
import nodePath from "node:path"

import { createRandomHash } from "../sundry"

// 删除套接字/命名管道文件
export function rmSockFile(sockName: string) {
    nodeFs.rmSync(getSockPath(sockName))
}

// 确定不同平台上套接字/命名管道文件的路径
export function getSockPath(name: string) {
    if (process.platform !== "win32") {
        return nodePath.join(getIpcRuntimeDir(), `${name}.sock`)
    } else {
        return `\\\\.\\pipe\\${name}`
    }
}

// 检查套接字/命名管道文件是否正在使用
export function isSockInUse(sockPath: string) {
    return new Promise<boolean>(resolve => {
        const socket = nodeNet.createConnection(sockPath, () => {
            resolve(true)
        })
        socket.on("error", () => {
            resolve(false)
        })
    })
}

// 获取可用的套接字/命名管道文件名称（带有哈希值后缀），此方法会清理
// 以该名称开头且未被使用的套接字文件（命名管道的清理由操作系统完成）
export async function getValidPathWithHash(name: string) {
    const existingSocks = new Set<string>()
    if (process.platform !== "win32") {
        const dir = getIpcRuntimeDir()
        nodeFs.mkdirSync(dir, {
            recursive: true
        })
        for (const fileName of nodeFs.readdirSync(dir)) {
            if (fileName.startsWith(name) && fileName.endsWith(".sock")) {
                const sockFullPath = nodePath.join(dir, fileName)
                if (await isSockInUse(sockFullPath)) {
                    existingSocks.add(sockFullPath)
                } else {
                    nodeFs.rmSync(sockFullPath)
                }
            }
        }
    }

    while (true) {
        const hash = createRandomHash(8)
        const nameWithHash = getSockPath(`${name}-${hash}`)
        if (process.platform !== "win32") {
            if (!existingSocks.has(nameWithHash)) {
                return nameWithHash
            }
        } else if (!(await isSockInUse(nameWithHash))) {
            return nameWithHash
        }
    }
}

export function getIpcRuntimeDir() {
    return nodePath.join(process.env.XDG_RUNTIME_DIR || nodeOs.tmpdir(), "qingkuai")
}
