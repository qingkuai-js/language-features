import type TS from "typescript"
import type { ConvertProtocolTextSpanWithContextVerifier } from "../types"

import {
    convertProtocolTextSpan,
    convertProtocolDefinitions,
    convertProtocolTextSpanWithContext
} from "../util/protocol"
import { commandStatus, session } from "../state"
import { HAS_BEEN_PROXIED_BY_QINGKUAI } from "../constant"
import { isPositionFlagSetBySourceIndex } from "../util/qingkuai"
import { isQingkuaiFileName } from "../../../../shared-util/assert"

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
    if (getReferences[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        return
    }
    sessionAny.getReferences = (...args: any) => {
        const dealtRefs: any[] = []
        const originalRet = getReferences.call(session, ...args)
        for (let i = 0; i < (originalRet.refs?.length || 0); i++) {
            const ref: TS.server.protocol.FileSpan = originalRet.refs[i]
            const convertRes = convertProtocolTextSpanWithContext(ref.file, ref)
            convertRes && dealtRefs.push({ ...ref, ...convertRes })
        }
        return (originalRet.refs = dealtRefs), originalRet
    }
    sessionAny.getReferences[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
}

export function proxyGetDefinitionAndBoundSpan() {
    const sessionAny = session as any
    const getDefinitionAndBoundSpan = sessionAny?.getDefinitionAndBoundSpan
    if (getDefinitionAndBoundSpan[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        return
    }
    sessionAny.getDefinitionAndBoundSpan = (...args: any) => {
        const originalRet = getDefinitionAndBoundSpan.call(session, ...args)
        return convertProtocolDefinitions(originalRet.definitions), originalRet
    }
    sessionAny.getDefinitionAndBoundSpan[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
}

export function proxyFindSourceDefinition() {
    const sessionAny = session as any
    const findSourceDefinition = sessionAny.findSourceDefinition
    if (findSourceDefinition[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        return
    }
    sessionAny.findSourceDefinition = (...args: any) => {
        const originalRet = findSourceDefinition.call(session, ...args)
        return convertProtocolDefinitions(originalRet), originalRet
    }
    sessionAny.findSourceDefinition[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
}

export function proxyGetImplementation() {
    const sessionAny = session as any
    const getImplementation = sessionAny.getImplementation
    if (getImplementation[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        return
    }
    sessionAny.getImplementation = (...args: any) => {
        const originalRet = getImplementation.call(session, ...args)
        return originalRet?.map((item: TS.server.protocol.FileSpan) => {
            return {
                ...item,
                ...convertProtocolTextSpanWithContext(item.file, item)
            }
        })
    }
    sessionAny.getImplementation[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
}

export function proxyGetEditsForFileRename() {
    const sessionAny = session as any
    const getEditsForFileRename = sessionAny.getEditsForFileRename.bind(session)
    if (getEditsForFileRename[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        return
    }

    sessionAny.getEditsForFileRename = (...args: any[]) => {
        const result: TS.server.protocol.FileCodeEdits[] = []
        const originalRet: TS.server.protocol.FileCodeEdits[] = getEditsForFileRename(...args)
        for (const item of originalRet) {
            if (!isQingkuaiFileName(item.fileName)) {
                result.push(item)
            }

            const dealtChanges: TS.server.protocol.CodeEdit[] = []
            for (const change of item.textChanges) {
                const convertRes = convertProtocolTextSpan(item.fileName, change)
                convertRes && dealtChanges.push({ ...change, ...convertRes })
            }
            if (dealtChanges.length) {
                result.push({ fileName: item.fileName, textChanges: dealtChanges })
            }
        }
        return result
    }
    sessionAny.getEditsForFileRename[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
}

export function proxyGetRenameLocations() {
    const sessionAny = session as any
    const getRenameLocations = sessionAny.getRenameLocations.bind(session)
    if (getRenameLocations[HAS_BEEN_PROXIED_BY_QINGKUAI]) {
        return
    }

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

            const dealtLocs: TS.server.protocol.RenameTextSpan[] = []
            for (let i = 0, delta = 0; i < locs.length; i++) {
                const verifier: ConvertProtocolTextSpanWithContextVerifier = (
                    index,
                    snapshot,
                    itemKind
                ) => {
                    if (itemKind !== "start") {
                        return true
                    }
                    delta = +isPositionFlagSetBySourceIndex(
                        snapshot,
                        index,
                        "isInterpolationAttributeStart"
                    )
                    return (
                        isPositionFlagSetBySourceIndex(snapshot, index, "inScript") ||
                        isPositionFlagSetBySourceIndex(snapshot, index, "isAttributeStart")
                    )
                }

                const convertRes = convertProtocolTextSpanWithContext(file, locs[i], verifier)
                if (!convertRes) {
                    continue
                }
                dealtLocs.push(convertRes)
                convertRes.start.offset += delta
            }
            dealtLocs.length && retLocs.push({ file, locs: dealtLocs })
        }

        return { ...originalRet, locs: retLocs }
    }

    sessionAny.getRenameLocations[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
}
