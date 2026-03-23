import type { Location } from "vscode-languageserver-types"
import type { CompileResult } from "../../../../types/common"
import type { GetScriptImplementationsFunc } from "../types/service"

import { URI } from "vscode-uri"
import { PositionFlag } from "qingkuai/compiler"

export async function findImplementations(
    cr: CompileResult,
    offset: number,
    getImplementations: GetScriptImplementationsFunc
): Promise<Location[] | null> {
    if (!cr.isPositionFlagSetAtIndex(PositionFlag.InScript, offset)) {
        return null
    }

    const response = await getImplementations(cr.filePath, offset)
    return (
        response &&
        response.map(item => {
            return {
                range: item.range,
                uri: URI.file(item.fileName).toString()
            }
        })
    )
}
