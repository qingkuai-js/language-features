import type { TypescriptAdapter } from "../adapter"
import type { AdapterPath, TsNormalizedPath, ComponentInfo } from "../../../../../types/common"

import { isInTopScope, walkTsNode } from "../ts-ast"
import { debugAssert, isQingkuaiFileName, isUndefined } from "../../../../../shared-util/assert"

export function getComponentInfos(adapter: TypescriptAdapter, filePath: TsNormalizedPath) {
    const sourceFile = adapter?.getDefaultSourceFile(filePath)!
    if (!debugAssert(sourceFile)) {
        return []
    }

    const project = adapter.getDefaultProject(filePath)
    const program = project?.getLanguageService().getProgram()
    const compilerOptions = program?.getCompilerOptions()
    const dirPath = adapter.path.dir(filePath)
    const config = adapter.getQingkuaiConfig(filePath)
    const importedQingkuaiFileNames = new Set<string>()
    const usedNames = new Set<string>()
    const componentInfos: ComponentInfo[] = []

    walkTsNode(sourceFile, node => {
        if (adapter.ts.isImportDeclaration(node) && isInTopScope(node)) {
            if (!isUndefined(node.importClause?.name)) {
                const identifierName = node.importClause.name.text
                if (adapter.ts.isStringLiteral(node.moduleSpecifier) && compilerOptions) {
                    const resolvedModules = project?.resolveModuleNameLiterals?.(
                        [node.moduleSpecifier],
                        filePath,
                        undefined,
                        compilerOptions,
                        sourceFile,
                        undefined
                    )
                    const resolvedModule = resolvedModules?.[0]?.resolvedModule
                    if (resolvedModule && isQingkuaiFileName(resolvedModule.resolvedFileName)) {
                        const absolute = adapter.getNormalizedPath(resolvedModule.resolvedFileName)
                        const relative = getRelativePathWithStartDot(
                            adapter.path,
                            dirPath,
                            absolute
                        )
                        const targetFileInfo = adapter.service.ensureGetQingkuaiFileInfo(absolute)
                        componentInfos.push({
                            imported: true,
                            name: identifierName,
                            absolutePath: targetFileInfo.path,
                            relativePath: relative,
                            slotNames: targetFileInfo.slotNames,
                            attributes: targetFileInfo.attributes,
                            type: targetFileInfo.defaultExportTypeStr
                        })
                        importedQingkuaiFileNames.add(absolute)
                        usedNames.add(identifierName)
                    }
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

            let name = targetFileInfo.componentName
            if (usedNames.has(name)) {
                let counter = 1
                while (usedNames.has((name = `${name}_${counter}`))) {
                    counter++
                }
            }
            usedNames.add(name)

            if (config?.resolveImportExtension) {
                relativePath = relativePath.slice(0, -adapter.path.ext(relativePath).length)
            }
            componentInfos.push({
                imported: false,
                relativePath: relativePath,
                absolutePath: targetFilePath,
                name,
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
