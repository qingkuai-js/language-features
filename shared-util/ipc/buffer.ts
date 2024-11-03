import { Message } from "./types"

// 将消息体转为buffer，此方法转换后的buffer前4个字节是消息体的长度
export function createMessageBuffer(data: any, name: string, id = 0) {
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

// 从buffer中读取消息，此方法与createMessageBuffer方法保持一致：将前4个字节读做消息体长度
export function readBuffer(buffer: Buffer, handler: (data: Message) => void) {
    while (buffer.length >= 4) {
        const messageLength = buffer.readUInt32BE(0)
        const totalLength = messageLength + 4
        if (buffer.length >= totalLength) {
            const messageBody = buffer.subarray(4, totalLength)
            const message = JSON.parse(messageBody.toString())
            buffer = buffer.subarray(totalLength)
            handler(message)
        } else break
    }
}
