import { isUndefined } from "../assert"
import { Message } from "./types"

// 将消息体转为buffer，此方法转换后的buffer前4个字节是消息体的长度
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

// 创建一个Buffer读取器，此方法与createMessageBuffer方法保持一致：将前4个字节读做消息体长度
// 返回的读取器中的read方法考虑了粘包/分包处理，每成功读取一个完整的数据包会调用一次handler回调
export function createBufferReader() {
    let preBuffer = Buffer.alloc(0)
    let messageLength: number | undefined = undefined

    return {
        read(buffer: Buffer, handler: (data: Message) => void) {
            for (let prefixLen = 0; buffer.length; ) {
                if (!isUndefined(messageLength)) {
                    prefixLen = 0
                } else {
                    messageLength = buffer.readUInt32BE(0) + (prefixLen = 4)
                }

                if (buffer.length >= messageLength) {
                    const bodyBuffer = buffer.subarray(prefixLen, messageLength)
                    const messageBody = Buffer.concat([preBuffer, bodyBuffer])
                    const message = JSON.parse(messageBody.toString())
                    buffer = buffer.subarray(messageLength)
                    preBuffer = Buffer.alloc(0)
                    messageLength = undefined
                    handler(message)
                } else {
                    const bodyBuffer = buffer.subarray(prefixLen)
                    preBuffer = Buffer.concat([preBuffer, bodyBuffer])
                    messageLength -= buffer.length
                    buffer = Buffer.alloc(0)
                    break
                }
            }
        }
    }
}
