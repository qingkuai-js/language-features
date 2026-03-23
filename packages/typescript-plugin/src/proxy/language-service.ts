import type TS from "typescript"

import { adapter } from "../state"
import { PROXIED_MARK } from "../constant"
import { isQingkuaiFileName } from "../../../../shared-util/assert"

// 首次获取诊断信息是完成 TypescriptAdapter 的初始化（确定 qingkuai 文件的类型定义内容）
export function proxyGetSemanticDiagnostics(languageService: TS.LanguageService) {
    const getSemanticDiagnostics = languageService.getSemanticDiagnostics
    languageService.getSemanticDiagnostics = fileName => {
        return (adapter.initilize(), getSemanticDiagnostics.call(languageService, fileName))
    }
}

// 在 getMoveToRefactoringFileSuggestions 执行期间过滤掉 program.getSourceFiles 结果中的 qingkuai 文件
export function proxyGetMoveToRefactoringFileSuggestions(languageService: TS.LanguageService) {
    let getMoveToRefactoringFileSuggestionsIsRunning = false
    const { getMoveToRefactoringFileSuggestions } = languageService
    languageService.getMoveToRefactoringFileSuggestions = (...args) => {
        const program = languageService.getProgram()
        program && proxyGetSourceFiles(program)
        getMoveToRefactoringFileSuggestionsIsRunning = true

        const originalRet = getMoveToRefactoringFileSuggestions.call(languageService, ...args)
        return ((getMoveToRefactoringFileSuggestionsIsRunning = false), originalRet)
    }

    function proxyGetSourceFiles(program: TS.Program) {
        const getSourceFiles = program.getSourceFiles.bind(program)
        if ((getSourceFiles as any)[PROXIED_MARK]) {
            return
        }
        program.getSourceFiles = () => {
            const originalRet = getSourceFiles!()
            if (!getMoveToRefactoringFileSuggestionsIsRunning) {
                return originalRet
            }
            return originalRet.filter(item => !isQingkuaiFileName(item.fileName))
        }
        ;(getSourceFiles as any)[PROXIED_MARK] = true
    }
}

// 获取文件重命名导致的内容变更时，将 qingkuai 文件中的变化修改为原始位置
export function proxyGetEditsForFileRename(languageService: TS.LanguageService) {
    const getEditsForFileRename = languageService.getEditsForFileRename
    languageService.getEditsForFileRename = (oldFilePath, newFilePath, ...rest) => {
        const originalRet = getEditsForFileRename.call(
            languageService,
            oldFilePath,
            newFilePath,
            ...rest
        )
        originalRet.forEach(item => {
            let removeRE: RegExp
            const editQingkuaiFile = isQingkuaiFileName(item.fileName)
            const qingkuaiConfig = editQingkuaiFile
                ? adapter.getQingkuaiConfig(item.fileName)
                : undefined
            const locationConvertor = adapter.service.createLocationConvertor(item.fileName)
            if (qingkuaiConfig?.resolveImportExtension) {
                removeRE = /\.qk(?:\/index(?:\.[jt]s)?)?$/
            } else {
                removeRE = /(?:\/index(?:\.[jt]s)?)?$/
            }
            item.textChanges.forEach(change => {
                if (editQingkuaiFile) {
                    change.span = locationConvertor.textSpan.toSourceTextSpan(change.span)
                }
                change.newText = change.newText.replace(removeRE, "")
            })
        })
        return originalRet
    }
}
