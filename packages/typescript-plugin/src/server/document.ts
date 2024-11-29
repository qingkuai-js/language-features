import type { OpenQkFileInfo } from "../types"

import { existsSync } from "fs"
import { fileURLToPath } from "url"
import { server, ts } from "../state"
import { isUndefined } from "../../../../shared-util/assert"
import { createRandomHash } from "../../../../shared-util/sundry"

const openQkFiles = new Set<string>()
const reverseMap = new Map<string, string>()
const mappedQkFiles = new Map<string, OpenQkFileInfo>()

export function getOpenQkMappedFiles() {
    return Array.from(openQkFiles).map(fileName => {
        return getMappingFileName(fileName)!
    })
}

export function isMappingFileName(fileName: string) {
    return reverseMap.has(fileName)
}

export function getMappingFileName(fileName: string) {
    return mappedQkFiles.get(fileName)?.mappingFileName
}

export function getMappingFileInfo(fileName: string) {
    return mappedQkFiles.get(fileName)
}

export function getRealName(mappingFileName: string) {
    return reverseMap.get(mappingFileName)
}

export function getMappedQkFiles() {
    return Array.from(mappedQkFiles).map(([_, info]) => {
        return info.mappingFileName
    })
}

export function attachDocumentManager() {
    server.onNotification("onDidOpen", (uri: string) => {
        const path = fileURLToPath(uri)
        openQkFiles.add(path), assignMappingFileForQkFile(path)
    })

    server.onNotification("onDidClose", (uri: string) => {
        openQkFiles.delete(fileURLToPath(uri))
    })
}

export function assignMappingFileForQkFile(fileName: string, scriptKind = ts.ScriptKind.JS) {
    let mappingFileName = getMappingFileName(fileName)
    if (isUndefined(mappingFileName)) {
        do {
            mappingFileName = `${fileName}.${createRandomHash(12)}.ts`
        } while (existsSync(mappingFileName) || reverseMap.has(mappingFileName))

        mappedQkFiles.set(fileName, {
            scriptKind,
            version: 0,
            mappingFileName
        })
        reverseMap.set(mappingFileName, fileName)
    }
    return getMappingFileInfo(fileName)!
}
