import type TS from "typescript"

import {
    proxyGetReferences,
    proxyExecuteCommand,
    proxyGetImplementation,
    proxyGetRenameLocations,
    proxyFindSourceDefinition,
    proxyGetEditsForFileRename,
    proxyGetDefinitionAndBoundSpan
} from "./session"
import {
    proxyEditContent,
    proxyCloseClientFile,
    proxyOnConfigFileChanged,
    proxyUpdateRootAndOptionsOfNonInferredProject
} from "./project-service"
import {
    proxyGetScriptKind,
    proxyGetScriptVersion,
    proxyGetScriptSnapshot,
    proxyGetCompletionsAtPosition,
    proxyResolveModuleNameLiterals,
    proxyGetMoveToRefactoringFileSuggestions
} from "./language-service"
import { projectService, session, ts } from "../state"
import { runAll } from "../../../../shared-util/sundry"
import { HAS_BEEN_PROXIED_BY_QINGKUAI } from "../constant"
import { proxyGetFileSize, proxyReadFile } from "./system"
import { isUndefined } from "../../../../shared-util/assert"

export function proxyTypescript(info: TS.server.PluginCreateInfo) {
    const { project, languageServiceHost, languageService } = info

    // proxy session
    const sessionAny = session as any
    if (!isUndefined(session) && !sessionAny[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        runAll([
            proxyGetReferences,
            proxyExecuteCommand,
            proxyGetImplementation,
            proxyGetRenameLocations,
            proxyFindSourceDefinition,
            proxyGetEditsForFileRename,
            proxyGetDefinitionAndBoundSpan
        ])
        sessionAny[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
    }

    // proxy ts.sys
    const systemAny = ts.sys as any
    if (!systemAny[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        runAll([proxyReadFile, proxyGetFileSize])
        systemAny[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
    }

    // proxy project service
    const projectServiceAny = projectService as any
    if (!projectServiceAny[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        runAll([
            proxyEditContent,
            proxyCloseClientFile,
            proxyOnConfigFileChanged,
            proxyUpdateRootAndOptionsOfNonInferredProject
        ])
        projectServiceAny[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
    }

    // proxy project and language service host
    const projectAny = project as any
    if (!projectAny[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        runAll([
            () => proxyGetScriptSnapshot(project),
            () => proxyGetScriptKind(languageServiceHost),
            () => proxyGetScriptVersion(languageServiceHost),
            () => proxyResolveModuleNameLiterals(languageServiceHost)
        ])
        projectAny[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
    }

    // proxy language service
    const languageServiceAny = languageService as any
    if (!languageServiceAny[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        runAll([
            () => proxyGetCompletionsAtPosition(languageService),
            () => proxyGetMoveToRefactoringFileSuggestions(languageService)
        ])
        languageServiceAny[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
    }
}
