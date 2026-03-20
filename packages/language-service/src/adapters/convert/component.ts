import type { AdapterPath, TsNormalizedPath, ComponentInfo } from "../../../../../types/common"
import type { TypescriptAdapter } from "../adapter"

import { isInTopScope, walkTsNode } from "../ts-ast"
import { debugAssert, isQingkuaiFileName, isUndefined } from "../../../../../shared-util/assert"

export function getComponentInfos(adapter: TypescriptAdapter, filePath: TsNormalizedPath) {
    const sourceFile = adapter?.getDefaultSourceFile(filePath)!
    if (!debugAssert(sourceFile)) {
        return []
    }

    const dirPath = adapter.path.dir(filePath)
    const config = adapter.getQingkuaiConfig(filePath)
    const importedQingkuaiFileNames = new Set<string>()
    const componentInfos: ComponentInfo[] = []
    const qingkuaiModules = adapter.resolvedQingkuaiModules.get(filePath)

    walkTsNode(sourceFile, node => {
        if (adapter.ts.isImportDeclaration(node) && isInTopScope(node)) {
            if (!isUndefined(node.importClause?.name)) {
                const identifierName = node.importClause.name.text
                if (
                    adapter.ts.isStringLiteral(node.moduleSpecifier) &&
                    qingkuaiModules?.has(node.moduleSpecifier.text)
                ) {
                    let relative = adapter.getNormalizedPath(node.moduleSpecifier.text)
                    let absolute = adapter.path.resolve(dirPath, node.moduleSpecifier.text)

                    const extension = !isQingkuaiFileName(relative) ? ".qk" : ""
                    const targetFileInfo = adapter.service.ensureGetQingkuaiFileInfo(
                        absolute + extension
                    )
                    componentInfos.push({
                        imported: true,
                        name: identifierName,
                        absolutePath: targetFileInfo.path,
                        relativePath: relative + extension,
                        slotNames: targetFileInfo.slotNames,
                        attributes: targetFileInfo.attributes,
                        type: targetFileInfo.defaultExportTypeStr
                    })
                    importedQingkuaiFileNames.add(absolute + extension)
                }
            }
        }
    })

    for (const targetFileName of adapter.getDefaultProject(filePath)!.getScriptFileNames()) {
        const targetFilePath = adapter.getNormalizedPath(targetFileName)
        if (
            targetFilePath !== filePath &&
            isQingkuaiFileName(targetFilePath) &&
            !importedQingkuaiFileNames.has(targetFilePath)
        ) {
            let relativePath = getRelativePathWithStartDot(adapter.path, dirPath, targetFilePath)
            const targetFileInfo = adapter.service.ensureGetQingkuaiFileInfo(targetFilePath)
            if (config?.resolveImportExtension) {
                relativePath = relativePath.slice(0, -adapter.path.ext(relativePath).length)
            }
            componentInfos.push({
                imported: false,
                relativePath: relativePath,
                absolutePath: targetFilePath,
                name: targetFileInfo.componentName,
                slotNames: targetFileInfo.slotNames,
                attributes: targetFileInfo.attributes,
                type: targetFileInfo.defaultExportTypeStr
            })
        }
    }
    return componentInfos
}

function getRelativePathWithStartDot(adapterPath: AdapterPath, from: string, to: string) {
    const relativePath = adapterPath.relative(from, to)
    return /\.{1,2}\//.test(relativePath) ? relativePath : `./${relativePath}`
}
