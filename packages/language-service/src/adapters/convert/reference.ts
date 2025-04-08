import type {
    FindReferenceResultItem,
    TPICCommonRequestParams
} from "../../../../../types/communication"
import type TS from "typescript"
import type { GetCompileResultFunc } from "../../types/service"

import { ts } from "../state"
import { lsRange } from "./struct"
import { getRealPath } from "../qingkuai"
import { findNodeAtPosition } from "../ts-ast"
import { findComponentTagRanges } from "../../util/qingkuai"
import { isQingkuaiFileName } from "../../../../../shared-util/assert"
import { GLOBAL_TYPE_IDNTIFIERS } from "../../../../../shared-util/constant"
import { filePathToComponentName } from "../../../../../shared-util/qingkuai"

export async function findAndConvertReferences(
    languageService: TS.LanguageService,
    getCompileRes: GetCompileResultFunc,
    { fileName, pos }: TPICCommonRequestParams
): Promise<FindReferenceResultItem[] | null> {
    const sourceFile = languageService.getProgram()?.getSourceFile(fileName)
    if (!sourceFile) {
        return null
    }

    const result: FindReferenceResultItem[] = []
    const node = findNodeAtPosition(sourceFile, pos)
    if (
        node?.parent &&
        GLOBAL_TYPE_IDNTIFIERS.has(node.getText()) &&
        (ts.isTypeAliasDeclaration(node.parent) || ts.isInterfaceDeclaration(node.parent))
    ) {
        for (const ref of languageService.getFileReferences(fileName)) {
            if (!isQingkuaiFileName(fileName)) {
                continue
            }

            const refRealPath = getRealPath(ref.fileName)
            const ranges = await findComponentTagRanges(
                refRealPath,
                filePathToComponentName(fileName),
                getCompileRes
            )
            ranges.forEach(range => result.push({ fileName: refRealPath, range }))
        }
    }

    const res = languageService.findReferences(fileName, pos)
    for (const item of res || []) {
        for (const ref of item.references) {
            if (ref.isDefinition) {
                continue
            }

            const range = lsRange.fromTextSpan(ref.fileName, ref.textSpan)
            range && result.push({ fileName: getRealPath(ref.fileName), range })
        }
    }
    return result
}
