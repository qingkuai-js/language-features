import type { Message } from "./types"

// 将消息体转为 buffer，此方法转换后的buffer前4个字节是消息体的长度
export function createMessageBuffer(data: any, name: string, id = "") {
    const messageBody = Buffer.from(
        JSON.stringify({
            body: data,
            messageId: id,
            methodName: name
        })
    )
    const messageLength = Buffer.alloc(4)
    messageLength.writeUInt32BE(messageBody.length)
    return Buffer.concat([messageLength, messageBody])
}

// 创建一个 Buffer 读取器，此方法与 createMessageBuffer 方法保持一致：将前4个字节读做消息体长度
// 返回的读取器中的 read 方法统一累积到内部缓冲后再按 长度前缀 切分，因此天然处理粘包/分包，
// 也包括"长度前缀本身被拆到两个数据包"的情形（旧实现在前缀未满 4 字节时会误判为完整报文并解析空体）
export function createBufferReader() {
    let pending = Buffer.alloc(0)

    return {
        read(chunk: Buffer, handler: (data: Message) => void) {
            pending = pending.length ? Buffer.concat([pending, chunk]) : chunk

            while (pending.length >= 4) {
                const bodyLength = pending.readUInt32BE(0)
                if (pending.length < 4 + bodyLength) {
                    break
                }

                const messageBody = pending.subarray(4, 4 + bodyLength)
                pending = pending.subarray(4 + bodyLength)

                // 单条报文解析失败不应让整个 socket 数据回调抛错（会变成进程级未捕获异常，
                // 打断语言服务器与插件之间的整条通道）；丢弃该条并由调用方的请求超时兜底
                try {
                    handler(JSON.parse(messageBody.toString()))
                } catch {}
            }
        }
    }
}
