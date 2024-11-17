import { fileURLToPath } from "url"
import { server } from "../state"

export const openQkFiles = new Set<string>()

export function attachDocumentManager() {
    server.onNotification("onDidOpen", (uri: string) => {
        openQkFiles.add(fileURLToPath(uri))
    })

    server.onNotification("onDidClose", (uri: string) => {
        openQkFiles.delete(fileURLToPath(uri))
    })
}
