import { languageServiceHost } from "../state"
import { QingKuaiSnapShot } from "../snapshot"

export const snapshotCache = new Map<string, QingKuaiSnapShot>()

export function proxyGetScriptSnapshot() {
    const ori = languageServiceHost.getScriptSnapshot
    languageServiceHost.getScriptSnapshot = fileName => {
        return snapshotCache.get(fileName) || ori.call(languageServiceHost, fileName)
    }
}
