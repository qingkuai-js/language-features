import { server } from "../state"

// 通过qingkuai语言服务器输出日志
export const Logger = {
    info(msg: string) {
        server.send("log/info", msg)
    },

    warn(msg: string) {
        server.send("log/warn", msg)
    },

    error(msg: string) {
        server.send("log/error", msg)
    }
}
