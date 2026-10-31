import type {
    ConfigCacheEntry,
    ConfigFileContent,
    HandleConfigParsingMessage
} from "../types/service"
import type { AdapterFS, AdapterPath, QingkuaiConfiguration } from "../../../../types/common"

import { ConfigParsingMessageKind } from "../enums"

const CONFIG_FILE_NAME = ".qingkuairc"

const DEFAULT_CONFIGURATION: QingkuaiConfiguration = {
    allowConstReactive: true,
    interpretiveComments: true,
    reactivityMode: "reactive",
    whitespace: "trim-collapse",
    requireReactivityMark: false,
    resolveImportExtension: true,
    preserveHtmlComments: "development"
}

export function createConfigResolver(
    fs: AdapterFS,
    path: AdapterPath,
    defaultConfig?: QingkuaiConfiguration
) {
    return new ConfigResolver(fs, path, defaultConfig)
}

class ConfigResolver {
    private defaultConfig!: QingkuaiConfiguration
    private index = new Map<string, Set<string>>()
    private cache = new Map<string, ConfigCacheEntry>()

    constructor(
        private fs: AdapterFS,
        private path: AdapterPath,
        defaultConfig?: QingkuaiConfiguration
    ) {
        this.setDefault(defaultConfig ?? {})
    }

    clearCache() {
        this.cache.clear()
        this.index.clear()
    }

    getDefaultConfig() {
        return { ...this.defaultConfig }
    }

    // 失效配置文件本身或 extends 目标对应的缓存，返回需要重新解析的配置文件路径
    removeCacheByPath(filePath: string) {
        const dirs = this.index.get(this.normalize(filePath))
        if (!dirs) {
            return []
        }

        const affected = new Set<string>()
        for (const dir of dirs) {
            const entry = this.cache.get(dir)
            if (!entry) {
                continue
            }

            this.cache.delete(dir)
            for (const file of entry.files) {
                this.untrack(file, dir)
            }
            affected.add(entry.configPath ?? filePath)
        }

        return [...affected]
    }

    setDefault(value: Partial<QingkuaiConfiguration>) {
        this.defaultConfig = { ...DEFAULT_CONFIGURATION, ...value }
        this.clearCache()
    }

    resolve(filePath: string, onmessage?: HandleConfigParsingMessage) {
        const dir = this.path.dir(filePath)
        const cached = this.cache.get(dir)
        if (cached) {
            return cached.config
        }

        let current = dir
        const files: string[] = []
        while (true) {
            const configPath = this.path.resolve(current, CONFIG_FILE_NAME)
            files.push(configPath)

            if (this.fs.exist(configPath)) {
                return this.load(dir, configPath, files, onmessage)
            }

            const parent = this.path.dir(current)
            if (parent === current) {
                return this.cacheAndReturn(dir, { ...this.defaultConfig }, files)
            }
            current = parent
        }
    }

    private load(
        dir: string,
        configPath: string,
        files: string[],
        onmessage?: HandleConfigParsingMessage
    ) {
        let parsed: unknown
        try {
            parsed = JSON.parse(this.fs.read(configPath))
        } catch {
            onmessage?.(configPath, {
                kind: ConfigParsingMessageKind.Error,
                value: "The configuration file content is not valid JSON."
            })
            return this.cacheAndReturn(dir, { ...this.defaultConfig }, files, configPath)
        }

        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            onmessage?.(configPath, {
                kind: ConfigParsingMessageKind.Error,
                value: "The configuration file content must be a JSON object."
            })
            return this.cacheAndReturn(dir, { ...this.defaultConfig }, files, configPath)
        }

        const { extends: extendsField, ...config } = parsed as ConfigFileContent
        let inherited: Partial<QingkuaiConfiguration> = {}

        if (typeof extendsField === "string" && extendsField !== "") {
            const extendsPath = this.path.resolve(this.path.dir(configPath), extendsField)
            files.push(extendsPath)

            if (!this.fs.exist(extendsPath)) {
                onmessage?.(configPath, {
                    kind: ConfigParsingMessageKind.Warning,
                    value: `The file referenced by "extends" does not exist.`
                })
            } else {
                try {
                    const extended: unknown = JSON.parse(this.fs.read(extendsPath))
                    if (!extended || typeof extended !== "object" || Array.isArray(extended)) {
                        throw new Error()
                    }

                    const { extends: _, ...rest } = extended as ConfigFileContent
                    inherited = rest
                } catch {
                    onmessage?.(configPath, {
                        kind: ConfigParsingMessageKind.Warning,
                        value: `The configuration file content referenced by "extends" field is not valid JSON.`
                    })
                }
            }
        } else if (extendsField !== undefined) {
            onmessage?.(configPath, {
                kind: ConfigParsingMessageKind.Warning,
                value: "Invalid extends field, ensure it's a valid file path."
            })
        }

        return this.cacheAndReturn(
            dir,
            { ...this.defaultConfig, ...inherited, ...config },
            files,
            configPath
        )
    }

    private cacheAndReturn(
        dir: string,
        config: QingkuaiConfiguration,
        candidateFiles: string[],
        configPath?: string
    ) {
        const files = [...new Set(candidateFiles)]
        this.cache.set(dir, { config, files, configPath })
        for (const file of files) {
            this.track(file, dir)
        }
        return config
    }

    private track(filePath: string, dir: string) {
        const key = this.normalize(filePath)
        let dirs = this.index.get(key)
        if (!dirs) {
            this.index.set(key, (dirs = new Set()))
        }
        dirs.add(dir)
    }

    private untrack(filePath: string, dir: string) {
        const key = this.normalize(filePath)
        const dirs = this.index.get(key)
        if (!dirs) {
            return
        }

        dirs.delete(dir)
        if (!dirs.size) {
            this.index.delete(key)
        }
    }

    // 大小写不敏感比较，避免 Windows 盘符或路径大小写差异导致缓存失效不到
    private normalize(filePath: string) {
        return this.path.resolve(filePath).toLowerCase()
    }
}
