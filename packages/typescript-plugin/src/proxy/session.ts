import type TS from "typescript"
import type { ConvertProtocolTextSpanWithContextVerifier } from "../types"

import {
    convertProtocolTextSpan,
    convertProtocolDefinitions,
    convertProtocolTextSpanWithContext
} from "../util/protocol"
import { commandStatus, session } from "../state"
import { qkContext } from "qingkuai-language-service/adapters"
import { isQingkuaiFileName } from "../../../../shared-util/assert"
import { DEFAULT_RANGE_WITH_CONTENT } from "../../../../shared-util/constant"

export function proxyExecuteCommand() {
    const executeCommand = session!.executeCommand
    session!.executeCommand = request => {
        const originalRet = executeCommand.call(session, request)
        commandStatus.get(request.command)?.[1]()
        return originalRet
    }
}

export function proxyGetReferences() {
    const sessionAny = session as any
    const getReferences = sessionAny.getReferences
    sessionAny.getReferences = (...args: any) => {
        const dealtRefs: any[] = []
        const originalRet = getReferences.call(session, ...args)
        for (let i = 0; i < (originalRet.refs?.length || 0); i++) {
            const ref: TS.server.protocol.FileSpan = originalRet.refs[i]
            const convertRes = convertProtocolTextSpanWithContext(
                qkContext.getRealPath(ref.file),
                ref
            )
            convertRes && dealtRefs.push({ ...ref, ...convertRes })
        }
        return (originalRet.refs = dealtRefs), originalRet
    }
}

export function proxyGetDefinitionAndBoundSpan() {
    const sessionAny = session as any
    const getDefinitionAndBoundSpan = sessionAny.getDefinitionAndBoundSpan
    sessionAny.getDefinitionAndBoundSpan = (...args: any) => {
        const originalRet = getDefinitionAndBoundSpan.call(session, ...args)
        return convertProtocolDefinitions(originalRet.definitions), originalRet
    }
}

export function proxyFindSourceDefinition() {
    const sessionAny = session as any
    const findSourceDefinition = sessionAny.findSourceDefinition
    sessionAny.findSourceDefinition = (...args: any) => {
        const originalRet = findSourceDefinition.call(session, ...args)
        return convertProtocolDefinitions(originalRet), originalRet
    }
}

export function proxyGetImplementation() {
    const sessionAny = session as any
    const getImplementation = sessionAny.getImplementation
    sessionAny.getImplementation = (...args: any) => {
        const originalRet = getImplementation.call(session, ...args)
        return originalRet?.map((item: TS.server.protocol.FileSpan) => {
            const convertRes = convertProtocolTextSpanWithContext(
                qkContext.getRealPath(item.file),
                item
            )
            return { ...item, ...(convertRes || DEFAULT_RANGE_WITH_CONTENT) }
        })
    }
}

export function proxyGetEditsForFileRename() {
    const sessionAny = session as any
    const getEditsForFileRename = sessionAny.getEditsForFileRename.bind(session)
    sessionAny.getEditsForFileRename = (...args: any[]) => {
        const result: TS.server.protocol.FileCodeEdits[] = []
        const originalRet: TS.server.protocol.FileCodeEdits[] = getEditsForFileRename(...args)
        for (const item of originalRet) {
            if (!isQingkuaiFileName(item.fileName)) {
                result.push(item)
            }

            const realPath = qkContext.getRealPath(item.fileName)
            const dealtChanges: TS.server.protocol.CodeEdit[] = []
            for (const change of item.textChanges) {
                const convertRes = convertProtocolTextSpan(realPath, change)
                convertRes && dealtChanges.push({ ...change, ...convertRes })
            }
            if (dealtChanges.length) {
                result.push({ fileName: realPath, textChanges: dealtChanges })
            }
        }
        return result
    }
}

export function proxyGetRenameLocations() {
    const sessionAny = session as any
    const getRenameLocations = sessionAny.getRenameLocations.bind(session)
    sessionAny.getRenameLocations = (...args: any[]) => {
        const originalRet: TS.server.protocol.RenameResponseBody = getRenameLocations(...args)

        if (!originalRet.locs.length) {
            return originalRet
        }

        const retLocs: TS.server.protocol.SpanGroup[] = []
        for (const { file, locs } of originalRet.locs) {
            if (!isQingkuaiFileName(file)) {
                retLocs.push({ file, locs })
                continue
            }

            const realPath = qkContext.getRealPath(file)
            const dealtLocs: TS.server.protocol.RenameTextSpan[] = []
            for (let i = 0, delta = 0; i < locs.length; i++) {
                const verifier: ConvertProtocolTextSpanWithContextVerifier = (
                    fileName,
                    index,
                    itemKind
                ) => {
                    if (itemKind !== "start") {
                        return true
                    }
                    delta = +qkContext.isPositionFlagSetBySourceIndex(
                        fileName,
                        index,
                        "isInterpolationAttributeStart"
                    )
                    return (
                        qkContext.isPositionFlagSetBySourceIndex(fileName, index, "inScript") ||
                        qkContext.isPositionFlagSetBySourceIndex(
                            fileName,
                            index,
                            "isAttributeStart"
                        )
                    )
                }

                const convertRes = convertProtocolTextSpanWithContext(realPath, locs[i], verifier)
                if (!convertRes) {
                    continue
                }
                dealtLocs.push(convertRes)
                convertRes.start.offset += delta
            }
            dealtLocs.length && retLocs.push({ file: realPath, locs: dealtLocs })
        }

        return { ...originalRet, locs: retLocs }
    }
}
