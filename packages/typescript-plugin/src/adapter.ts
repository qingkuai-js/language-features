import type TS from "typescript"
import type { AdapterCompileInfo } from "qingkuai-language-service"

import {
    forEachProject,
    getUserPreferences,
    getDefaultSourceFile,
    getFormattingOptions,
    getDefaultLanguageService
} from "./util/typescript"
import { resolve } from "node:path"
import { CUSTOM_PATH } from "./constant"
import { existsSync, readFileSync } from "node:fs"
import { ensureGetSnapshotOfQingkuaiFile } from "./util/qingkuai"
import { getQingkuaiConfig } from "./server/configuration/method"
import { init, qkContext } from "qingkuai-language-service/adapters"
import { debugAssert, isQingkuaiFileName } from "../../../shared-util/assert"

export function initializeAdapter(ts: typeof TS) {
    init({
        ts,
        fs: {
            exist: existsSync,
            read: path => readFileSync(path, "utf-8")
        },
        getCompileInfo,
        getFullFileNames,
        path: CUSTOM_PATH,
        getUserPreferences,
        getLineAndCharacter,
        getFormattingOptions,
        getTsLanguageService,
        getConfig: getQingkuaiConfig,
        getInterIndexByLineAndCharacter,
        typeDeclarationFilePath: resolve(__dirname, "../dts/qingkuai")
    })
}

function getFullFileNames() {
    const resultSet = new Set<string>()
    forEachProject(p => {
        for (const f of p.getScriptFileNames()) {
            resultSet.add(f)
        }
    })
    return Array.from(resultSet)
}

function getTsLanguageService(fileName: string) {
    return getDefaultLanguageService(fileName)
}

function getLineAndCharacter(fileName: string, pos: number) {
    const sourceFile = getDefaultSourceFile(fileName)
    return sourceFile && sourceFile.getLineAndCharacterOfPosition(pos)
}

function getCompileInfo(fileName: string): AdapterCompileInfo {
    debugAssert(isQingkuaiFileName(fileName))

    const realPath = qkContext.getRealPath(fileName)
    const qingkuaiSnapshot = ensureGetSnapshotOfQingkuaiFile(realPath)
    return {
        itos: qingkuaiSnapshot.itos,
        slotInfo: qingkuaiSnapshot.slotInfo,
        positions: qingkuaiSnapshot.positions,
        scriptKind: qingkuaiSnapshot.scriptKind,
        content: qingkuaiSnapshot.getFullText(),
        attributeInfos: qingkuaiSnapshot.attributeInfos,
        refAttrValueStartIndexes: qingkuaiSnapshot.refAttrValueStartIndexes
    }
}

function getInterIndexByLineAndCharacter(fileName: string, lineAndCharacter: TS.LineAndCharacter) {
    return (
        getDefaultSourceFile(fileName)?.getPositionOfLineAndCharacter(
            lineAndCharacter.line,
            lineAndCharacter.character
        ) ?? 0
    )
}
