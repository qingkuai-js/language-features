import type { GeneralFunc } from "../../types/util"

// 将消息体转为 buffer，并添加4字节的长度前缀
export function createMessageBuffer(data: any) {
    const messageBody = Buffer.from(JSON.stringify(data))
    const messageLength = Buffer.alloc(4)
    messageLength.writeUInt32BE(messageBody.length)
    return Buffer.concat([messageLength, messageBody])
}

// 创建一个Buffer读取器，它会根据长度前缀读取每条消息后调用指定的消息处理器
export function createBufferReader(handlers: Record<string, GeneralFunc>) {
    let buffer = Buffer.alloc(0)
    return {
        read(data: Buffer) {
            buffer = Buffer.concat([buffer, data])

            while (buffer.length >= 4) {
                const messageLength = buffer.readUInt32BE(0)
                const totalLength = messageLength + 4
                if (buffer.length >= totalLength) {
                    const messageBody = buffer.subarray(4, totalLength)
                    const message = JSON.parse(messageBody.toString())
                    const handler = handlers[message.uri]
                    buffer = buffer.subarray(totalLength)
                    handler && handler(message.data)
                } else break
            }
        }
    }
}
