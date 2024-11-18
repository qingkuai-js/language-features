import fs from "fs"
import { createConnection } from "net"

// 删除套接字/命名管道文件
export function rmSockFile(sockName: string) {
    fs.rmSync(getSockPath(sockName))
}

// 确定不同平台上套接字/命名管道文件的路径
export function getSockPath(name: string) {
    if (process.platform !== "win32") {
        return `/tmp/${name}.sock`
    } else {
        return `\\\\.\\pipe\\${name}`
    }
}

// 检查套接字/命名管道文件是否正在使用
export function isSockInUse(sockPath: string) {
    return new Promise<boolean>(resolve => {
        createConnection(sockPath, () => {
            resolve(true)
        }).on("error", () => {
            resolve(false)
        })
    })
}

// 获取可用的套接字/命名管道文件名称（带有哈希值后缀），此方法会清理
// 以该名称开头且未被使用的套接字文件（命名管道的清理由操作系统完成）
export async function getValidPathWithHash(name: string) {
    const existingSocks = new Set<string>()
    if (process.platform !== "win32") {
        for (const fileName of fs.readdirSync("/tmp")) {
            if (fileName.startsWith(name) && fileName.endsWith(".sock")) {
                if (await isSockInUse(fileName)) {
                    existingSocks.add(fileName)
                } else {
                    fs.rmSync("/tmp/" + fileName)
                }
            }
        }
    }

    while (true) {
        const hash = Math.floor(Math.random() * 0xffffffff).toString(16)
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
