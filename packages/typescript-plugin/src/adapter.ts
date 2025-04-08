import type TS from "typescript"
import type { AdapterCompileInfo } from "qingkuai-language-service"

import {
    forEachProject,
    getUserPreferences,
    getDefaultSourceFile,
    getFormattingOptions,
    getDefaultLanguageService
} from "./util/typescript"
import { existsSync, readFileSync } from "node:fs"
import { ensureGetSnapshotOfQingkuaiFile } from "./util/qingkuai"
import { getQingkuaiConfig } from "./server/configuration/method"
import { init, qkContext } from "qingkuai-language-service/adapters"
import { basename, dirname, extname, relative, resolve } from "node:path"
import { debugAssert, isQingkuaiFileName } from "../../../shared-util/assert"

export function initializeAdapter(ts: typeof TS) {
    init({
        ts,
        fs: {
            exist: existsSync,
            read: path => readFileSync(path, "utf-8")
        },
        path: {
            resolve,
            relative,
            ext: extname,
            dir: dirname,
            base: basename
        },
        getCompileInfo,
        getFullFileNames,
        getUserPreferences,
        getLineAndCharacter,
        getFormattingOptions,
        getTsLanguageService,
        getConfig: getQingkuaiConfig,
        getInterIndexByLineAndCharacter,
        typeDeclarationFilePath: resolve(__dirname, "../dts/qingkuai")
    })
}

function getTsLanguageService(fileName: string) {
    return getDefaultLanguageService(fileName)
}

function getLineAndCharacter(fileName: string, pos: number) {
    const sourceFile = getDefaultSourceFile(fileName)
    return sourceFile && sourceFile.getLineAndCharacterOfPosition(pos)
}

function getFullFileNames() {
    const result: string[] = []
    return forEachProject(p => result.push(...p.getScriptFileNames())), result
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
        content: qingkuaiSnapshot.getFullText()
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
