import { commandStatus, server } from "../state"
import { TPICHandler } from "../../../../shared-util/constant"
import { generatePromiseAndResolver } from "../../../../shared-util/sundry"

export function attachWaitCommand() {
    server.onRequest(TPICHandler.WaitForTSCommand, async (name: string) => {
        let status = commandStatus.get(name)
        if (!status) {
            commandStatus.set(name, (status = generatePromiseAndResolver()))
        }
        return await status[0], commandStatus.delete(name), null
    })
}
