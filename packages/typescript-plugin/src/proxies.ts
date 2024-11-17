import fs from "fs"
import path from "path"
import { compile } from "qingkuai/compiler"
import { QingKuaiSnapShot } from "./snapshot"
import { isUndefined } from "../../../shared-util/assert"
import { refreshQkFileDiagnostic } from "./server/diagnostic"
import { getScriptKindKey } from "../../../shared-util/qingkuai"
import { languageServiceHost, projectService, ts, typeRefStatement } from "./state"

export const snapshotCache = new Map<string, QingKuaiSnapShot>()

// 代理获取快照的方法，qk文件的快照为QingKuaiSnapshot，且由snapshotCache缓存
export function proxyGetScriptSnapshot() {
    const ori = languageServiceHost.getScriptSnapshot
    languageServiceHost.getScriptSnapshot = fileName => {
        const cached = snapshotCache.get(fileName)
        if (!isUndefined(cached)) {
            return cached
        }

        const oriRet = ori.call(languageServiceHost, fileName)
        if (fileName.endsWith(".qk") && isUndefined(cached)) {
            const content = fs.readFileSync(fileName, "utf-8")
            const compileRes = compile(content, {
                check: true,
                typeRefStatement
            })
            const scriptKind = ts.ScriptKind[getScriptKindKey(compileRes)]
            const snapshot = new QingKuaiSnapShot(compileRes.code, scriptKind)

            // 如果ts语言服务由.qk文件激活，则已被缓存的快照是磁盘内容，这里需要修改其内容
            if (!isUndefined(oriRet)) {
                const oriContentLength = oriRet.getLength()
                if (content === oriRet.getText(0, oriContentLength)) {
                    const scriptInfo = projectService.getScriptInfo(fileName)
                    scriptInfo?.editContent(0, oriContentLength, compileRes.code)
                }
            }

            return snapshotCache.set(fileName, snapshot), snapshot
        }

        return oriRet
    }
}

// 代理模块解析方法，如果目标是qk文件且它存在于本地磁盘，则成功解析（扩展名为.ts)
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
                Object.assign(item, {
                    resolvedModule: {
                        packageId: undefined,
                        originalPath: undefined,
                        extension: ts.Extension.Ts,
                        resolvedFileName: modulePath,
                        resolvedUsingTsExtension: false,
                        isExternalLibraryImport: false
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

// 自定义快照缓存中如果还存在某个qk文件，就不需要关闭
export function proxyCloseClientFile() {
    const ori = projectService.closeClientFile.bind(projectService)
    projectService.closeClientFile = (fileName, ...rest) => {
        if (!fileName.endsWith(".qk") || !snapshotCache.has(fileName)) {
            return ori(fileName, ...rest)
        }
    }
}

// 非qk文件修改时，需要刷新已打开的qk文件诊断信息
export function proxyEditContent() {
    const proxyCheckKey = "__hasBeenProxiedByQingkuai"
    const ori = projectService.getScriptInfo.bind(projectService)
    projectService.getScriptInfo = fileName => {
        const oriRet = ori(fileName) as any
        if (
            !oriRet[proxyCheckKey] &&
            !fileName.endsWith(".qk") &&
            !isUndefined(oriRet?.editContent)
        ) {
            const oriEditContent = oriRet.editContent.bind(oriRet)
            oriRet.editContent = (...args: any) => {
                refreshQkFileDiagnostic()
                return oriEditContent(...args)
            }
            oriRet[proxyCheckKey] = true
        }
        return oriRet
    }
}

export function proxyOnConfigFileChanged() {
    // used to access private method
    const projectServiceAsAny = projectService as any
    const ori = projectServiceAsAny.onConfigFileChanged.bind(projectService)
    projectServiceAsAny.onConfigFileChanged = (...args: any) => {
        setTimeout(refreshQkFileDiagnostic, 2500)
        return ori(...args)
    }
}
