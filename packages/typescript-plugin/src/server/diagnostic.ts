import type { DiagnosticKind } from "../types"
import type { Diagnostic, DiagnosticMessageChain } from "typescript"
import type { TSDiagnostic, TSDiagnosticRelatedInformation } from "../../../../types/communication"

import { QingKuaiSnapShot } from "../snapshot"
import { debounce } from "../../../../shared-util/sundry"
import { editQingKuaiScriptInfo } from "./updateSnapshot"
import { isEmptyString, isString, isUndefined } from "../../../../shared-util/assert"
import { languageService, languageServiceHost, projectService, server, ts } from "../state"
import { getMappingFileInfo, getOpenQkFileInfos, getRealName, isMappingFileName } from "./document"

export const qingkuaiDiagnostics = new Map<string, Diagnostic[]>()

export function attachGetDiagnostic() {
    server.onRequest<string, TSDiagnostic[]>("getDiagnostic", (fileName: string) => {
        const mappingFileInfo = getMappingFileInfo(fileName)!
        const oriDiagnostics = qingkuaiDiagnostics.get(fileName) || []
        const diagnosticMethods: DiagnosticKind[] = ["getSyntacticDiagnostics"]

        // Semtic模式下进行全部诊断，PartialSemantic/Syntactic模式下只进行语法检查
        if (projectService.serverMode === ts.LanguageServiceMode.Semantic) {
            diagnosticMethods.push("getSemanticDiagnostics", "getSuggestionDiagnostics")
        }

        diagnosticMethods.forEach(m => {
            oriDiagnostics.push(...languageService[m](mappingFileInfo.mappingFileName))
        })

        return oriDiagnostics.map(item => {
            const fri = (item.relatedInformation || []).filter(ri => {
                return !isUndefined(ri.file)
            })
            const relatedInformation = fri.map(ri => {
                const res: TSDiagnosticRelatedInformation = {
                    start: ri.start || 0,
                    length: ri.length || 0,
                    filePath: ri.file!.fileName,
                    message: formatDiagnosticMessage(ri.messageText)
                }

                const getRange = (offset: number) => {
                    return ri.file!.getLineAndCharacterOfPosition(offset)
                }

                // 非qk文件时需要返回诊断相关信息范围
                if (!res.filePath.endsWith(".qk")) {
                    res.range = {
                        start: getRange(res.start),
                        end: getRange(res.start + res.length)
                    }
                }

                return res
            })

            return {
                relatedInformation,
                code: item.code,
                kind: item.category,
                length: item.length || 0,
                deprecated: Boolean(item.reportsDeprecated),
                unnecessary: Boolean(item.reportsUnnecessary),
                start: mappingFileInfo.getPos(item.start || 0),
                message: formatDiagnosticMessage(item.messageText)
            }
        })
    })
}

// 刷新引用文件的诊断信息，如果目标文件是.qk文件，则通知qingkuai语言服务器重新推送诊断信息，第二个参数用于
// 描述当前文档的脚本类型是否发生了变化，如果发生了变化，需要模拟编辑目标文档以触发重新解析导入语句：查看文档最后
// 一个字符是否为空格，若是则删除，不是则添加；此方法添加了300ms的防抖机制，以防止引用文档的诊断信息被频繁地更新
//
// 注意：如果触发刷新诊断信息的文件是.qk文件（通过判断byFileName参数的扩展名确定）需要刷新所有引用文档的诊断信息，
// 反之则只需要刷新.qk文件的诊断信息（其他类型的诊断信息更新由原始ts语言服务或其他ts插件服务负责）；如果byFileName
// 参数为空字符串，表示当前调用为配置文件变动触发（通常为修改了tsconfig.json文件），需要刷新所有已打开文档的诊断信息
export const refreshDiagnostics = debounce(
    (byFileName: string, scriptKindChanged: boolean) => {
        const referenceFileNames: string[] = []
        const byQingKuaiFile = byFileName.endsWith(".qk")
        const byConfigChanged = isEmptyString(byFileName)

        if (byQingKuaiFile) {
            const mappingFileInfo = getMappingFileInfo(byFileName)
            if (mappingFileInfo?.isOpen) {
                byFileName = mappingFileInfo.mappingFileName
            } else return
        }

        if (!byConfigChanged) {
            languageService.getFileReferences(byFileName).forEach(entry => {
                referenceFileNames.push(entry.fileName)
            })
        } else {
            getOpenQkFileInfos().forEach(fileInfo => {
                referenceFileNames.push(fileInfo.mappingFileName)
            })
            projectService.openFiles.forEach((_, path) => {
                referenceFileNames.push(projectService.getScriptInfoForPath(path)!.fileName)
            })
        }

        referenceFileNames.forEach(fileName => {
            const scriptInfo = projectService.getScriptInfo(fileName)!
            const snapshot = languageServiceHost.getScriptSnapshot(fileName)!

            const contentLength = snapshot.getLength()
            const endsWithSpace = snapshot.getText(contentLength - 1, contentLength) === " "

            if (isMappingFileName(fileName)) {
                const realFileName = getRealName(fileName)!
                if (scriptKindChanged) {
                    const content = (snapshot as QingKuaiSnapShot).getFullText()
                    const newContent = endsWithSpace ? content.slice(0, -1) : content + " "
                    editQingKuaiScriptInfo(realFileName, newContent, scriptInfo.scriptKind)
                }
                server.sendNotification("publishDiagnostics", realFileName)
            } else {
                if (!scriptInfo.isScriptOpen || (!byConfigChanged && !byQingKuaiFile)) {
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

// 诊断信息为链表形式时，将其整理为一个字符串表示
function formatDiagnosticMessage(mt: string | DiagnosticMessageChain) {
    if (isString(mt)) {
        return mt
    }
    if (isUndefined(mt.next)) {
        return mt + mt.messageText
    }
    return mt.messageText + "  " + mt.next.reduce((p, c) => p + c.messageText, "")
}
