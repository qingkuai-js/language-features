import type { ScriptKind } from "typescript"

import { QingKuaiSnapShot } from "../../snapshot"
import { isUndefined } from "../../../../../shared-util/assert"
import { ensureFileOpenStatus, getMappingFileInfo } from "./document"
import { ts, languageService, project, projectService, snapshotCache } from "../../state"

// 增量更新qk文件ScriptInfo的内容
export function editQingKuaiScriptInfo(fileName: string, content: string, scriptKind: ScriptKind) {
    const program = languageService.getProgram()
    const newSnapshot = new QingKuaiSnapShot(content)
    const mappingFileInfo = getMappingFileInfo(fileName)!
    const mappingFileName = mappingFileInfo.mappingFileName
    const oldSnapshot = snapshotCache.get(mappingFileName)
    const scriptInfo = projectService.getScriptInfo(mappingFileName)

    if (isUndefined(scriptInfo) || isUndefined(oldSnapshot)) {
        // const info = projectService.getOrCreateScriptInfoForNormalizedPath(
        //     ts.server.toNormalizedPath(mappingFileName),
        //     true
        // )
        // if (!isUndefined(info)) {
        //     info.attachToProject(project)

        //     if (isUndefined(program?.getSourceFile(mappingFileName))) {
        //         info.markContainingProjectsAsDirty()
        //         project.updateGraph()
        //     }
        // }
        // info?.editContent(0, 0, content)

        projectService.openClientFile(
            mappingFileName,
            "",
            scriptKind,
            project.getCurrentDirectory()
        )
        projectService.getScriptInfo(mappingFileName)?.editContent(0, 0, content)
    } else if (!isUndefined(oldSnapshot)) {
        const change = newSnapshot.getChangeRange(oldSnapshot)
        const changeStart = change.span.start
        scriptInfo.editContent(
            changeStart,
            changeStart + change.span.length,
            newSnapshot.getText(changeStart, changeStart + change.newLength)
        )
    }

    mappingFileInfo.version++
    // ensureFileOpenStatus(mappingFileInfo)
    mappingFileInfo.scriptKind = scriptKind
    snapshotCache.set(mappingFileName, newSnapshot ?? oldSnapshot)
}
