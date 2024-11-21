import type { OpenQkFileInfo } from "../types"

import { existsSync } from "fs"
import { fileURLToPath } from "url"
import { server, ts } from "../state"
import { isUndefined } from "../../../../shared-util/assert"
import { createRandomHash } from "../../../../shared-util/sundry"

const reverseMap = new Map<string, string>()

export const openQkFiles = new Map<string, OpenQkFileInfo>()

export function isMappingFileName(fileName: string) {
    return reverseMap.has(fileName)
}

export function getMappingFileName(fileName: string) {
    return openQkFiles.get(fileName)?.mappingFileName
}

export function getRealName(mappingFileName: string) {
    return reverseMap.get(mappingFileName)
}

export function attachDocumentManager() {
    server.onNotification("onDidOpen", (uri: string) => {
        openQkFile(fileURLToPath(uri))
    })

    server.onNotification("onDidClose", (uri: string) => {
        openQkFiles.delete(fileURLToPath(uri))
    })
}

export function openQkFile(fileName: string) {
    let mappingFileName = getMappingFileName(fileName)
    if (isUndefined(mappingFileName)) {
        do {
            mappingFileName = `${fileName}.${createRandomHash(12)}.ts`
        } while (existsSync(mappingFileName) || reverseMap.has(mappingFileName))

        openQkFiles.set(fileName, {
            mappingFileName,
            scriptKind: ts.ScriptKind.JS
        })
        reverseMap.set(mappingFileName, fileName)
    }
    return mappingFileName
}
