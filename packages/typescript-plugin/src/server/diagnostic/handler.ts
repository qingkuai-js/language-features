import type {
    GetDiagnosticResultItem,
    RefreshDiagnosticParams
} from "../../../../../types/communication"
import type { RealPath } from "../../../../../types/common"

import { refreshDiagnostics } from "./refresh"
import { ts, server, projectService } from "../../state"
import { convertor } from "qingkuai-language-service/adapters"
import { TPICHandler } from "../../../../../shared-util/constant"
import { getDefaultLanguageService } from "../../util/typescript"

export function attachRefreshDiagnostic() {
    server.onNotification<RefreshDiagnosticParams>(
        TPICHandler.RefreshDiagnostic,
        ({ byFileName, scriptKindChanged }) => {
            refreshDiagnostics(byFileName, scriptKindChanged)
        }
    )
}

export function attachGetDiagnostic() {
    server.onRequest<RealPath, GetDiagnosticResultItem[]>(TPICHandler.GetDiagnostic, fileName => {
        const languageService = getDefaultLanguageService(fileName)
        if (!languageService) {
            return []
        }
        return convertor.getAndConvertDiagnostics(
            languageService,
            fileName,
            projectService.serverMode === ts.LanguageServiceMode.Semantic
        )
    })
}
