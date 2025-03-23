import { getRealPath } from "../util/qingkuai"
import { openQingkuaiFiles, projectService } from "../state"
import { refreshDiagnostics } from "../server/diagnostic/refresh"
import { HAS_BEEN_PROXIED_BY_QINGKUAI, RefreshDiagnosticKind } from "../constant"
import { isEmptyString, isQingkuaiFileName } from "../../../../shared-util/assert"

export function proxyCloseClientFile() {
    const closeClientFile = projectService.closeClientFile
    projectService.closeClientFile = (...args) => {
        const realPath = getRealPath(args[0])
        const scriptInfo = projectService.getScriptInfo(args[0])
        if (
            scriptInfo &&
            !openQingkuaiFiles.has(realPath) &&
            projectService.openFiles.has(scriptInfo.path)
        ) {
            return closeClientFile.call(projectService, ...args)
        }
    }
}

// 代理js/ts配置文件变更，刷新qk文件诊断信息
export function proxyOnConfigFileChanged() {
    const projectServiceAsAny = projectService as any
    const onConfigFileChanged = projectServiceAsAny.onConfigFileChanged

    projectServiceAsAny.onConfigFileChanged = (...args: any) => {
        setTimeout(() => {
            refreshDiagnostics(RefreshDiagnosticKind.typescriptConfig, false)
        }, 2500)

        return onConfigFileChanged.bind(projectService, ...args)
    }
}

// 代理文件编辑，非qk文件修改时应刷新qk文件的诊断信息
export function proxyEditContent() {
    const getScriptInfo = projectService.getScriptInfo.bind(projectService)
    projectService.getScriptInfo = fileName => {
        const scriptInfo = getScriptInfo(fileName)

        if (
            scriptInfo &&
            !isQingkuaiFileName(fileName) &&
            !(scriptInfo.editContent as any)[HAS_BEEN_PROXIED_BY_QINGKUAI]
        ) {
            const editContent = scriptInfo.editContent.bind(scriptInfo)
            scriptInfo.editContent = (start, end, newText) => {
                editContent(start, end, newText)

                // 确保不是其他qk文件修改时刷新诊断时导致的更改
                const snapshot = scriptInfo.getSnapshot()
                const contentLen = snapshot.getLength()
                if (
                    end !== contentLen ||
                    !(
                        (start === end && newText === " ") ||
                        (start === end - 1 && isEmptyString(newText))
                    )
                ) {
                    refreshDiagnostics(fileName, false)
                }
            }

            // @ts-expect-error: attach supplementary property
            scriptInfo.editContent[HAS_BEEN_PROXIED_BY_QINGKUAI] = true
        }

        return scriptInfo
    }
}

// TS Bug: 启用插件后pdateRootAndOptionsOfNonInferredProject调用逻辑错误
// see typescript issue: https://github.com/microsoft/TypeScript/issues/61302
export function proxyUpdateRootAndOptionsOfNonInferredProject() {
    const porjectServiceAny = projectService as any
    const oriMethod = porjectServiceAny.updateRootAndOptionsOfNonInferredProject
    porjectServiceAny.updateRootAndOptionsOfNonInferredProject = (project: any, ...rest: any) => {
        const existingPluginNames = new Set<string>()
        const isBug = project.plugins?.some(({ name }: any) => {
            if (existingPluginNames.has(name)) {
                return true
            }
            return existingPluginNames.add(name), false
        })
        !isBug && oriMethod.call(projectService, project, ...rest)
    }
}
