import type { QingKuaiFileInfo } from "../../types"

import { existsSync } from "fs"
import { ts } from "../../state"
import { isUndefined } from "../../../../../shared-util/assert"
import { createRandomHash } from "../../../../../shared-util/sundry"

const reverseMap = new Map<string, string>()
const mappedQkFiles = new Map<string, QingKuaiFileInfo>()

export function getOpenQkFileInfos() {
    const fileInfos: QingKuaiFileInfo[] = []
    mappedQkFiles.forEach(info => {
        if (info.isOpen) {
            fileInfos.push(info)
        }
    })
    return fileInfos
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

// 为.qk文件分配一个映射文件信息，如果它已经存在，则只修改它的打开状态
export function assignMappingFileForQkFile(
    fileName: string,
    isOpen: boolean,
    properties: Partial<QingKuaiFileInfo> = {}
) {
    let mappingFileName = getMappingFileName(fileName)
    if (isUndefined(mappingFileName)) {
        do {
            mappingFileName = `${fileName}.${createRandomHash(12)}.ts`
        } while (existsSync(mappingFileName) || reverseMap.has(mappingFileName))

        mappedQkFiles.set(fileName, {
            isOpen,
            itos: [],
            offset: 0,
            version: 0,
            slotInfo: {},
            interCode: "",
            mappingFileName,
            scriptKind: ts.ScriptKind.JS,
            getPos(pos: number) {
                if (!pos) {
                    return 0
                }
                return pos - this.offset
            },
            ...properties
        })
        reverseMap.set(mappingFileName, fileName)
    }

    const ret = getMappingFileInfo(fileName)!
    return (ret.isOpen = isOpen), ret
}
