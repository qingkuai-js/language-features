import type { QingKuaiSnapShot } from "../../snapshot"

import {
    getRealName,
    isMappingFileName,
    getMappingFileInfo,
    getOpenQkFileInfos
} from "../content/document"
import { updateQingkuaiSnapshot } from "../content/snapshot"
import { debounce } from "../../../../../shared-util/sundry"
import { editQingKuaiScriptInfo } from "../content/scriptInfo"
import { languageService, languageServiceHost, projectService, server } from "../../state"

// 刷新引用文件的诊断信息，如果目标文件是.qk文件，则通知qingkuai语言服务器重新推送诊断信息，第二个参数用于
// 描述当前文档的脚本类型是否发生了变化，如果发生了变化，需要模拟编辑目标文档以触发重新解析导入语句：查看文档最后
// 一个字符是否为空格，若是则删除，不是则添加；此方法添加了300ms的防抖机制，以防止引用文档的诊断信息被频繁地更新
//
// 注意：如果触发刷新诊断信息的文件是.qk文件（通过判断byFileName参数的扩展名确定）需要刷新所有引用文档的诊断信息，
// 反之则只需要刷新.qk文件的诊断信息（其他类型的诊断信息更新由原始ts语言服务或其他ts插件服务负责）；如果byFileName
// 参数以///开头，表示当前调用为配置文件变动触发（通常为tsconfig.json/jsconfig.json/.qingkuairc等文件被修改），
// 需要刷新所有已打开文档的诊断信息，如果有qingkuai配置文件变动触发，则应重新遍历中间代码语法树执行自定义检查相关逻辑
export const refreshDiagnostics = debounce(
    (byFileName: string, scriptKindChanged: boolean) => {
        const referenceFileNames: string[] = []
        const byQingKuaiFile = byFileName.endsWith(".qk")
        const byConfigChanged = byFileName.startsWith("///")

        if (byQingKuaiFile) {
            const mappingFileInfo = getMappingFileInfo(byFileName)
            if (mappingFileInfo?.isOpen) {
                byFileName = mappingFileInfo.mappingFileName
            } else return
        }

        if (!byConfigChanged) {
            languageService.getFileReferences(byFileName).forEach(({ fileName }) => {
                if (
                    getMappingFileInfo(fileName)?.isOpen ||
                    projectService.getScriptInfo(fileName)?.isScriptOpen()
                ) {
                    referenceFileNames.push(fileName)
                }
            })
        } else {
            getOpenQkFileInfos().forEach(fileInfo => {
                referenceFileNames.push(fileInfo.mappingFileName)
            })
            projectService.openFiles.forEach((_, path) => {
                referenceFileNames.push(projectService.getScriptInfoForPath(path)!.fileName)
            })
            scriptKindChanged = true
        }

        referenceFileNames.forEach(fileName => {
            const scriptInfo = projectService.getScriptInfo(fileName)!
            const snapshot = languageServiceHost.getScriptSnapshot(fileName)!

            const contentLength = snapshot.getLength()
            const endsWithSpace = snapshot.getText(contentLength - 1, contentLength) === " "

            if (isMappingFileName(fileName)) {
                const realFileName = getRealName(fileName)!
                if (scriptKindChanged) {
                    if (byFileName === "///qk") {
                        const mappingFileInfo = getMappingFileInfo(realFileName)!
                        updateQingkuaiSnapshot(
                            realFileName,
                            mappingFileInfo.interCode,
                            mappingFileInfo.itos,
                            mappingFileInfo.slotInfo,
                            mappingFileInfo.scriptKind
                        )
                    } else {
                        const content = (snapshot as QingKuaiSnapShot).getFullText()
                        const newContent = endsWithSpace ? content.slice(0, -1) : content + " "
                        editQingKuaiScriptInfo(realFileName, newContent, scriptInfo.scriptKind)
                    }
                }
                server.sendNotification("publishDiagnostics", realFileName)
            } else {
                if (!byConfigChanged && !byQingKuaiFile) {
                    return
                }

                if (scriptKindChanged) {
                    if (!endsWithSpace) {
                        scriptInfo.editContent(contentLength, contentLength, " ")
                    } else {
                        scriptInfo.editContent(contentLength - 1, contentLength, "")
                    }
                }

                // @ts-expect-error: access private method
                projectService.eventHandler({
                    eventName: "projectsUpdatedInBackground",
                    data: {
                        openFiles: [fileName]
                    }
                })
            }
        })
    },
    300,
    fileName => fileName // use fileName as debounce id
)
