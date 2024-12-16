import { TextSpan } from "typescript"
import { isUndefined } from "../../../../../shared-util/assert"
import type {
    GetCompletionParams,
    GetCompletionResult,
    GetCompletionResultEntry
} from "../../../../../types/communication"

import { languageService, Logger, projectService, server, ts } from "../../state"
import { getMappingFileName } from "../content/document"
import { excludeProperty } from "../../../../../shared-util/sundry"

const optionalSameKeys = [
    "data",
    "sortText",
    "isSnippet",
    "filterText",
    "insertText",
    "labelDetails",
    "replacementSpan",
    "commitCharacters"
] as const

export function attachGetCompletion() {
    server.onRequest<GetCompletionParams, GetCompletionResult>("getCompletion", params => {
        const mappingFileName = getMappingFileName(params.fileName)
        if (isUndefined(mappingFileName)) {
            return null
        }

        const normalizedPath = ts.server.toNormalizedPath(mappingFileName)
        const userPreferences = excludeProperty(
            projectService.getPreferences(normalizedPath),
            "lazyConfiguredProjectsFromExternalProject"
        )
        const completionRes = languageService.getCompletionsAtPosition(
            mappingFileName,
            params.pos,
            {
                ...userPreferences,
                includeCompletionsWithInsertText: true,
                includeCompletionsForModuleExports: true
            },
            projectService.getFormatCodeOptions(normalizedPath)
        )
        if (isUndefined(completionRes)) {
            return null
        }

        const entries: GetCompletionResultEntry[] = completionRes.entries.map(item => {
            const kindModifiers = new Set(item.kindModifiers?.split(/,|\s+/g))
            const ret: GetCompletionResultEntry = {
                kind: item.kind,
                label: item.name || (item.insertText ?? "")
            }
            if (item.source) {
                ret.labelDetails = {
                    description: item.source
                }
            }
            if (item.sourceDisplay) {
                ret.labelDetails = {
                    description: ts.displayPartsToString(item.sourceDisplay)
                }
            }
            if (item.isRecommended) {
                ret.preselect = true
            }
            if (kindModifiers.has("optional")) {
                ret.label += "?"
            }
            if (kindModifiers.has("deprecated")) {
                ret.deprecated = true
            }
            optionalSameKeys.forEach(key => {
                // @ts-expect-error
                item[key] && (ret[key] = item[key])
            })
            return ret
        })

        return {
            entries,
            isIncomplete: !!completionRes.isIncomplete,
            defaultRepalcementSpan: completionRes.optionalReplacementSpan,
            defaultCommitCharacters: completionRes.defaultCommitCharacters ?? []
        }
    })
}
