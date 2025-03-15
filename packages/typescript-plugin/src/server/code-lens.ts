import { server } from "../state"
import { getDefaultLanguageServiceByFileName } from "../util/typescript"

export function attachCodeLens() {
    server.onRequest("getNavigationTree", (fileName: string) => {
        const languageService = getDefaultLanguageServiceByFileName(fileName)
        return languageService?.getNavigationTree(fileName)
    })
}
