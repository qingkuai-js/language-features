import type TS from "typescript"
import type { RealPath } from "../../../../../types/common"
import type { ASTPositionWithFlag, SlotInfo } from "qingkuai/compiler"

import { projectService } from "../../state"
import { editQingKuaiScriptInfo } from "./scriptInfo"
import { convertor } from "qingkuai-language-service/adapters"
import { getDefaultLanguageService } from "../../util/typescript"
import { ensureGetSnapshotOfQingkuaiFile } from "../../util/qingkuai"

export function updateQingkuaiSnapshot(
    fileName: RealPath,
    content: string,
    itos: number[],
    slotInfo: SlotInfo,
    scriptKind: TS.ScriptKind,
    typeDeclarationLen: number,
    positions: ASTPositionWithFlag[],
    refAttrValueStartIndexes: Set<number>
) {
    const originalScriptKind = ensureGetSnapshotOfQingkuaiFile(fileName).scriptKind

    const editScriptInfoCommon = (text: string) => {
        if (originalScriptKind !== scriptKind) {
            updateScriptKindOfQingkuaiFile(fileName, scriptKind)
        }
        editQingKuaiScriptInfo(
            fileName,
            text,
            itos,
            slotInfo,
            scriptKind,
            typeDeclarationLen,
            positions,
            refAttrValueStartIndexes
        )
    }
    editScriptInfoCommon(content)

    // 将补全了全局类型声明及默认导出语句的内容更新到快照
    editScriptInfoCommon(
        convertor.ensureExport(
            getDefaultLanguageService(fileName)!,
            fileName,
            content,
            typeDeclarationLen
        )
    )
    ensureGetSnapshotOfQingkuaiFile(fileName).attributeInfos = convertor.getComponentAttributes(
        getDefaultLanguageService(fileName)!,
        fileName
    )
}

// 动态修改qk文件的脚本类型
function updateScriptKindOfQingkuaiFile(fileName: string, scriptKind: TS.ScriptKind) {
    const scriptInfo = projectService.getScriptInfo(fileName)
    if (!scriptInfo) {
        return
    }

    // @ts-expect-error: change read-only property
    scriptInfo.scriptKind = scriptKind

    // @ts-expect-error: access private property
    projectService.documentRegistry.getBuckets().forEach(bucket => {
        const entry = bucket.get(scriptInfo.path)
        entry && (entry.sourceFile.scriptKind = scriptKind)
    })
}
