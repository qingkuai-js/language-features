import { server, ts } from "../state"
import { RealPath } from "../../../../types/common"
import { TPICHandler } from "../../../../shared-util/constant"
import { getDefaultLanguageService } from "../util/typescript"

export function attachCodeLens() {
    server.onRequest(TPICHandler.GetNavigationTree, (fileName: RealPath) => {
        const languageService = getDefaultLanguageService(fileName)
        return languageService?.getNavigationTree(ts.server.toNormalizedPath(fileName)) ?? null
    })
}
