import type { UpdateSnapshot } from "../../types/communication"

import { server } from "./src/state"

export function attachServerHandlers() {
    server.onMessage<UpdateSnapshot>("updateSnapshot", params => {
        console.log(params)
    })
}
