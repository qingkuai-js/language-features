import type TS from "typescript"

import {
    proxyGetEditsForFileRename,
    proxyGetSemanticDiagnostics,
    proxyGetMoveToRefactoringFileSuggestions
} from "./language-service"
import { adapter } from "../state"
import { PROXIED_MARK } from "../constant"
import { isUndefined } from "../../../../shared-util/assert"
import { proxyUpdateRootAndOptions } from "./project-service"
import { proxyExecuteCommand, proxyToFileToSpan } from "./session"

export function proxyTypescript(info: TS.server.PluginCreateInfo) {
    if (adapter) {
        adapter.proxyProject(info.project)
    }

    // proxy session
    const sessionAny = info.session as any
    if (!isUndefined(sessionAny) && !sessionAny[PROXIED_MARK]) {
        proxyToFileToSpan(info.session)
        proxyExecuteCommand(sessionAny)
        sessionAny[PROXIED_MARK] = true
    }

    // proxy project service
    const projectServiceAny = info.project.projectService as any
    if (!projectServiceAny[PROXIED_MARK]) {
        proxyUpdateRootAndOptions(info.project.projectService)
        projectServiceAny[PROXIED_MARK] = true
    }

    // proxy language service
    const languageServiceAny = info.languageService as any
    if (!languageServiceAny[PROXIED_MARK]) {
        languageServiceAny[PROXIED_MARK] = true
        proxyGetEditsForFileRename(info.languageService)
        proxyGetSemanticDiagnostics(info.languageService)
        proxyGetMoveToRefactoringFileSuggestions(info.languageService)
    }
}
