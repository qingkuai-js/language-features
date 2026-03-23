import { TP_HANDLERS } from "../../../../shared-util/constant"
import { tsServerCommandStatus, tsPluginIpcServer } from "../state"
import { generatePromiseAndResolver } from "../../../../shared-util/sundry"

export function attachWaitCommand() {
    tsPluginIpcServer.onRequest(TP_HANDLERS.WaitForTSCommand, async (name: string) => {
        let status = tsServerCommandStatus.get(name)
        if (!status) {
            tsServerCommandStatus.set(name, (status = generatePromiseAndResolver()))
        }
        return (await status[0], tsServerCommandStatus.delete(name), null)
    })
}
