import type { TypescriptAdapter } from "../adapter"
import type { ResolveFilePathParams } from "../../../../../types/communication"

export function resolveFilePath(adapter: TypescriptAdapter, params: ResolveFilePathParams) {
    const normalizedFrom = adapter.getNormalizedPath(params.from)
    const program = adapter.getDefaultProgram(normalizedFrom)

    if (!program) {
        return params.to
    }

    const compilerOptions = program.getCompilerOptions()
    const tryResolve = (specifier: string) => {
        return adapter.ts.resolveModuleName(specifier, params.from, compilerOptions, adapter.ts.sys)
    }

    // 尝试原始路径解析（tsconfig paths 在此生效）
    const resolved = tryResolve(params.to)
    if (resolved.resolvedModule) {
        return resolved.resolvedModule.resolvedFileName
    }

    // ts.resolveModuleName 不识别 .qk 扩展名，依次尝试补上
    for (const suffix of [".qk", "/index.qk"]) {
        const ret = tryResolve(params.to + suffix)
        if (ret.resolvedModule) {
            return ret.resolvedModule.resolvedFileName
        }
    }

    return params.to
}
