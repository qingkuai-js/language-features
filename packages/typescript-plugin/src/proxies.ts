import fs from "fs"
import path from "path"
import { compile } from "qingkuai/compiler"
import { QingKuaiSnapShot } from "./snapshot"
import { HasBeenProxiedByQingKuai } from "./constant"
import { isUndefined } from "../../../shared-util/assert"
import { refreshQkFileDiagnostic } from "./server/diagnostic"
import { getScriptKindKey } from "../../../shared-util/qingkuai"
import { languageServiceHost, projectService, ts, typeRefStatement } from "./state"
import { getMappingFileName, getRealName, isMappingFileName, openQkFile } from "./server/document"

// 快照缓存，键是映射文件名称而非原始文件名称
export const snapshotCache = new Map<string, QingKuaiSnapShot>()

// 代理查询文件是否存在的方法，扩展名为qk的文件直接返回false，它们在ts语言
// 服务中的扩展名为ts，可以通过getMappingFileName获取到qk文件映射的ts文件名称
export function proxyFileExists() {
    const pshOri = projectService.host.fileExists.bind(projectService.host)
    const lshOri = languageServiceHost.fileExists.bind(languageServiceHost)
    projectService.host.fileExists = path => {
        if (path.endsWith(".qk")) {
            return false
        }
        return isMappingFileName(path) || pshOri(path)
    }
    languageServiceHost.fileExists = path => {
        return isMappingFileName(path) || lshOri(path)
    }
}

// 代理获取快照的方法，qk文件的快照为QingKuaiSnapshot，且由snapshotCache缓存
export function proxyGetScriptSnapshot() {
    const ori = languageServiceHost.getScriptSnapshot
    languageServiceHost.getScriptSnapshot = fileName => {
        const cached = snapshotCache.get(fileName)
        if (!isUndefined(cached)) {
            return cached
        }

        // 若文件名为映射文件名且不存在快照，则使用qingkuai编译器编译磁盘文件内容
        // 并为此映射文件名创建新快照，这种情况下此方法的返回值就是这个新创建的快照
        // 上述情况主要发生在import语句中（模块并不一定已被qingkuai语言服务器打开）
        if (isMappingFileName(fileName) && isUndefined(cached)) {
            const content = fs.readFileSync(getRealName(fileName)!, "utf-8")
            const compileRes = compile(content, {
                check: true,
                typeRefStatement
            })
            const scriptKind = ts.ScriptKind[getScriptKindKey(compileRes)]
            const snapshot = new QingKuaiSnapShot(compileRes.code, scriptKind)
            return snapshotCache.set(fileName, snapshot), snapshot
        }

        return ori.call(languageServiceHost, fileName)
    }
}

// 代理模块解析方法，如果目标是qk文件且它存在于本地磁盘，解析的模块路径为映射文件名，
// 扩展名均为.ts，当映射文件名不存在时，需要调用openQkFile方法为其分配一个映射文件名
export function proxyResolveModuleNameLiterals() {
    const ori = languageServiceHost.resolveModuleNameLiterals?.bind(languageServiceHost)
    if (isUndefined(ori)) {
        return undefined
    }

    languageServiceHost.resolveModuleNameLiterals = (moduleLiterals, ...rest) => {
        const ret = ori(moduleLiterals, ...rest)
        const curDir = path.dirname(rest[3].fileName)
        ret.forEach((item, index) => {
            const moduleText = moduleLiterals[index].text
            const modulePath = path.resolve(curDir, moduleText)
            if (moduleText.endsWith(".qk") && fs.existsSync(modulePath)) {
                let mappingFileName = getMappingFileName(modulePath)
                if (isUndefined(mappingFileName)) {
                    mappingFileName = openQkFile(modulePath)
                }

                // 如果映射文件名不存在快照则会调用qingkuai编译器编译磁盘上的文件内容
                const snapshot = languageServiceHost.getScriptSnapshot(
                    mappingFileName
                ) as QingKuaiSnapShot
                const isTs = snapshot?.scriptKind === ts.ScriptKind.TS
                Object.assign(item, {
                    resolvedModule: {
                        packageId: undefined,
                        originalPath: undefined,
                        isExternalLibraryImport: false,
                        resolvedUsingTsExtension: false,
                        resolvedFileName: mappingFileName,
                        extension: ts.Extension[isTs ? "Ts" : "Js"]
                    },
                    failedLookupLocations: undefined
                })
            }
        })
        return ret
    }
}

// 代理脚本类型获取方法，qk文件的脚本类型由其快照中的scriptKind决定
export function proxyGetScriptKind() {
    const ori = languageServiceHost.getScriptKind?.bind(languageServiceHost)
    if (isUndefined(ori)) {
        return
    }

    languageServiceHost.getScriptKind = fileName => {
        if (!fileName.endsWith(".qk")) {
            return ori(fileName)
        }
        return snapshotCache.get(fileName)?.scriptKind || ts.ScriptKind.JS
    }
}

// 非qk文件修改时，需要刷新已打开的qk文件诊断信息
export function proxyEditContent() {
    const ori = projectService.getScriptInfo.bind(projectService)
    projectService.getScriptInfo = fileName => {
        // 断言为any，以访问其私有属性及添加新属性
        // asserts to access its private property and add new property
        const oriRetAsAny = ori(fileName) as any
        if (
            !isUndefined(oriRetAsAny) &&
            !oriRetAsAny.fileName.endsWith(".qk") &&
            !oriRetAsAny[HasBeenProxiedByQingKuai] &&
            !isUndefined(oriRetAsAny?.editContent) &&
            !isMappingFileName(oriRetAsAny.fileName)
        ) {
            const oriEditContent = oriRetAsAny.editContent.bind(oriRetAsAny)
            oriRetAsAny.editContent = (...args: any) => {
                refreshQkFileDiagnostic()
                return oriEditContent(...args)
            }
            oriRetAsAny[HasBeenProxiedByQingKuai] = true
        }
        return oriRetAsAny
    }
}

export function proxyOnConfigFileChanged() {
    // 断言为any以访问其私有属性
    // assert to access its private property
    const projectServiceAsAny = projectService as any
    const ori = projectServiceAsAny.onConfigFileChanged.bind(projectService)
    projectServiceAsAny.onConfigFileChanged = (...args: any) => {
        setTimeout(refreshQkFileDiagnostic, 2500)
        return ori(...args)
    }
}
