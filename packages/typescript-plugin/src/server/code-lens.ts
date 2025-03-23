import { server, ts } from "../state"
import { RealPath } from "../../../../types/common"
import { TPICHandler } from "../../../../shared-util/constant"
import { getDefaultLanguageServiceByFileName } from "../util/typescript"

export function attachCodeLens() {
    server.onRequest(TPICHandler.GetNavigationTree, (fileName: RealPath) => {
        const languageService = getDefaultLanguageServiceByFileName(fileName)
        return languageService?.getNavigationTree(ts.server.toNormalizedPath(fileName))
    })
}
