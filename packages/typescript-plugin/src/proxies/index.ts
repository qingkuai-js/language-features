import type TS from "typescript"

import {
    proxyGetReferences,
    proxyExecuteCommand,
    proxyGetImplementation,
    proxyGetRenameLocations,
    proxyFindSourceDefinition,
    proxyGetDefinitionAndBoundSpan,
    proxyGetEditsForFileRename
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
    proxyResolveModuleNameLiterals,
    proxyGetMoveToRefactoringFileSuggestions,
    proxyGetCompletionsAtPosition
} from "./language-service"
import { session } from "../state"
import { runAll } from "../../../../shared-util/sundry"
import { proxyGetFileSize, proxyReadFile } from "./system"
import { isUndefined } from "../../../../shared-util/assert"

export function ProxyTypescriptSessionAndProjectServiceMethods() {
    if (!isUndefined(session)) {
        runAll([
            proxyGetReferences,
            proxyExecuteCommand,
            proxyGetImplementation,
            proxyGetRenameLocations,
            proxyFindSourceDefinition,
            proxyGetEditsForFileRename,
            proxyGetDefinitionAndBoundSpan
        ])
    }
    runAll([
        proxyReadFile,
        proxyGetFileSize,
        proxyEditContent,
        proxyCloseClientFile,
        proxyOnConfigFileChanged,
        proxyUpdateRootAndOptionsOfNonInferredProject
    ])
}

export function proxyTypescriptLanguageServiceMethods(info: TS.server.PluginCreateInfo) {
    const { project, languageServiceHost, languageService } = info
    runAll([
        () => proxyGetScriptSnapshot(project),
        () => proxyGetScriptKind(languageServiceHost),
        () => proxyGetScriptVersion(languageServiceHost),
        () => proxyGetCompletionsAtPosition(languageService),
        () => proxyResolveModuleNameLiterals(languageServiceHost),
        () => proxyGetMoveToRefactoringFileSuggestions(languageService)
    ])
}
