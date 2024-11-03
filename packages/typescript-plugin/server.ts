import type { UpdateSnapshot } from "../../types/communication"

import { server } from "./src/state"

export function attachServerHandlers() {
    server.onNotification<UpdateSnapshot>("updateSnapshot", params => {
        console.log(params)
    })
}
