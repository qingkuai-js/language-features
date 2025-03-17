import { server } from "../state"
import { TPICHandler } from "../../../../shared-util/constant"
import { getDefaultLanguageServiceByFileName } from "../util/typescript"

export function attachCodeLens() {
    server.onRequest(TPICHandler.getNavigationTree, (fileName: string) => {
        const languageService = getDefaultLanguageServiceByFileName(fileName)
        return languageService?.getNavigationTree(fileName)
    })
}
