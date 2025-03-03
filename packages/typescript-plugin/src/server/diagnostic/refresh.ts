import { updateQingkuaiSnapshot } from "../content/snapshot"
import { debounce } from "../../../../../shared-util/sundry"
import { editQingKuaiScriptInfo } from "../content/scriptInfo"
import { isUndefined } from "../../../../../shared-util/assert"
import { getScriptKindKey } from "../../../../../shared-util/qingkuai"
import { ts, projectService, server, snapshotCache } from "../../state"
import { getContainingProjectsByFileName, isFileOpening } from "../../util/typescript"
import { compileQingkuaiFileToInterCode, isQingkuaiFileName } from "../../util/qingkuai"

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
        const waitingTsFileNames: string[] = []
        const byConfigChanged = byFileName.startsWith("///")
        const byQingKuaiFile = isQingkuaiFileName(byFileName)

        if (byQingKuaiFile && !isFileOpening(byFileName)) {
            return
        }

        if (byConfigChanged) {
            scriptKindChanged = true
            projectService.openFiles.forEach((_, path) => {
                referenceFileNames.push(projectService.getScriptInfo(path)!.fileName)
            })
        } else {
            getContainingProjectsByFileName(byFileName).forEach(project => {
                const languageService = project.getLanguageService()
                languageService?.getFileReferences(byFileName).forEach(entry => {
                    isFileOpening(entry.fileName) && referenceFileNames.push(entry.fileName)
                })
            })
        }

        referenceFileNames.forEach(fileName => {
            const scriptInfo = projectService.getScriptInfo(fileName)

            if (isUndefined(scriptInfo)) {
                return
            }

            const snapshot = scriptInfo.getSnapshot()
            const contentLength = snapshot.getLength()
            const endsWithSpace = snapshot.getText(contentLength - 1, contentLength) === " "

            if (isQingkuaiFileName(fileName)) {
                if (scriptKindChanged) {
                    if (byFileName === "///qk") {
                        const compileRes = compileQingkuaiFileToInterCode(fileName)
                        updateQingkuaiSnapshot(
                            fileName,
                            compileRes.code,
                            compileRes.interIndexMap.itos,
                            compileRes.inputDescriptor.slotInfo,
                            ts.ScriptKind[getScriptKindKey(compileRes)]
                        )
                    } else {
                        const qingkuaiSnapshot = snapshotCache.get(fileName)!
                        const content = qingkuaiSnapshot.getFullText()
                        const newContent = endsWithSpace ? content.slice(0, -1) : content + " "
                        editQingKuaiScriptInfo(
                            fileName,
                            newContent,
                            qingkuaiSnapshot.itos,
                            qingkuaiSnapshot.slotInfo,
                            qingkuaiSnapshot.scriptKind
                        )
                    }
                }
                server.sendNotification("publishDiagnostics", fileName)
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

                waitingTsFileNames.push(fileName)
            }
        })

        // prettier-ignore
        // @ts-expect-error: access private method
        waitingTsFileNames.length && projectService.eventHandler({
            eventName: "projectsUpdatedInBackground",
            data: {
                openFiles: waitingTsFileNames
            }
        })
    },
    300,
    fileName => fileName // use fileName as debounce id
)
