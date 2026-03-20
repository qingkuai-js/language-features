import type TS from "typescript"

import { PROXIED_MARK } from "../constant"
import { refreshDiagnostics } from "../server/diagnostic/refresh"
import { isQingkuaiFileName } from "../../../../shared-util/assert"

// 代理js/ts配置文件变更，刷新qk文件诊断信息
export function proxyOnConfigFileChanged(projectService: TS.server.ProjectService) {
    const projectServiceAsAny = projectService as any
    const onConfigFileChanged = projectServiceAsAny.onConfigFileChanged

    projectServiceAsAny.onConfigFileChanged = (...args: any) => {
        setTimeout(() => {
            refreshDiagnostics()
        }, 2500)

        return onConfigFileChanged.bind(projectService, ...args)
    }
}

// 代理文件编辑，修改非 qingkuai 文件时刷新依赖了它的 qingkuai 文件的诊断信息
export function proxyEditContent(projectService: TS.server.ProjectService) {
    const getScriptInfo = projectService.getScriptInfo.bind(projectService)
    projectService.getScriptInfo = fileName => {
        const scriptInfo = getScriptInfo(fileName)
        const editContent = scriptInfo?.editContent
        if (editContent && !isQingkuaiFileName(fileName) && !(editContent as any)[PROXIED_MARK]) {
            scriptInfo.editContent = (start, end, newText) => {
                refreshDiagnostics()
                editContent.call(scriptInfo, start, end, newText)
            }
            ;(scriptInfo.editContent as any)[PROXIED_MARK] = true
        }
        return scriptInfo
    }
}

// 启用插件后 updateRootAndOptionsOfNonInferredProject 调用逻辑错误
// 参考 typescript issue: https://github.com/microsoft/TypeScript/issues/61302
//
// After enabling the plugin, the invocation logic of `updateRootAndOptionsOfNonInferredProject` is incorrect
// Refer to TypeScript issue: https://github.com/microsoft/TypeScript/issues/61302
// export function proxyUpdateRootAndOptions() {
//     const porjectServiceAny = projectService as any
//     const oriMethod = porjectServiceAny.updateRootAndOptionsOfNonInferredProject
//     porjectServiceAny.updateRootAndOptionsOfNonInferredProject = (project: any, ...rest: any) => {
//         const existingPluginNames = new Set<string>()
//         const isBug = project.plugins?.some(({ name }: any) => {
//             if (existingPluginNames.has(name)) {
//                 return true
//             }
//             return (existingPluginNames.add(name), false)
//         })
//         !isBug && oriMethod.call(projectService, project, ...rest)
//     }
// }
