import path from "path"
import { languageServiceHost, ts } from "../state"
import { isUndefined } from "../../../../shared-util/assert"

export function proxyResolveModuleNameLiterals() {
    const ori = languageServiceHost.resolveModuleNameLiterals
    if (!isUndefined(ori)) {
        languageServiceHost.resolveModuleNameLiterals = (moduleLiterals, ...rest) => {
            const ret = ori.call(languageServiceHost, moduleLiterals, ...rest)
            const fileName = rest[3].fileName
            ret.forEach((item, index) => {
                const literal = moduleLiterals[index]
                if (literal.text.endsWith(".qk")) {
                    Object.assign(item, {
                        resolvedModule: {
                            packageId: undefined,
                            originalPath: undefined,
                            extension: ts.Extension.Ts,
                            resolvedUsingTsExtension: true,
                            isExternalLibraryImport: false,
                            resolvedFileName: path.resolve(fileName, "../", literal.text)
                        },
                        failedLookupLocations: undefined
                    })
                }
            })
            return ret
        }
    }
}
