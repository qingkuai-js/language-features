import type TS from "typescript"

import {
    proxyGetEditsForFileRename,
    proxyGetSemanticDiagnostics,
    proxyGetMoveToRefactoringFileSuggestions
} from "./language-service"
import { adapter } from "../state"
import { PROXIED_MARK } from "../constant"
import { isUndefined } from "../../../../shared-util/assert"
import { proxyExecuteCommand, proxyToFileToSpan } from "./session"
import { proxyEditContent, proxyOnConfigFileChanged } from "./project-service"

export function proxyTypescript(info: TS.server.PluginCreateInfo) {
    adapter.proxyProject(info.project)

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
        projectServiceAny[PROXIED_MARK] = true
        proxyEditContent(info.project.projectService)
        proxyOnConfigFileChanged(info.project.projectService)
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
