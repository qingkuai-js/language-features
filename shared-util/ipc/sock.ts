import fs from "fs"

// 删除套接字/命名管道文件
export function rmSockFile(sockName: string) {
    const sockPath = getSockPath(sockName)
    if (fs.existsSync(sockPath)) {
        fs.rmSync(sockPath)
    }
}

// 确定不同平台上套接字/命名管道文件的路径
export function getSockPath(name: string) {
    if (process.platform !== "win32") {
        return `/tmp/${name}.sock`
    } else {
        return `\\\\.\\pipe\\${name}`
    }
}
