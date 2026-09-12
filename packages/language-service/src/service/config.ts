import type { AdapterFS, AdapterPath, QingkuaiConfiguration } from "../../../../types/common"

import { ConfigParsingMessageKind } from "../enums"
import { HandleConfigParsingMessage } from "../types/service"

export function createConfigResolver(
    fs: AdapterFS,
    path: AdapterPath,
    defaultConfig?: QingkuaiConfiguration
) {
    return new ConfigResolver(fs, path, defaultConfig)
}

class ConfigResolver {
    private defaultConfig!: QingkuaiConfiguration
    private cache = new Map<string, QingkuaiConfiguration>()

    constructor(
        private fs: AdapterFS,
        private path: AdapterPath,
        defaultConfig?: QingkuaiConfiguration
    ) {
        this.setDefault(defaultConfig ?? {})
    }

    clearCache() {
        this.cache.clear()
    }

    getDefaultConfig() {
        return this.defaultConfig
    }

    removeCacheByPath(filePath: string) {
        const dir = this.path.dir(filePath)
        for (const key of Object.keys(this.cache)) {
            if (key.startsWith(dir)) {
                this.cache.delete(dir)
            }
        }
    }

    setDefault(value: Partial<QingkuaiConfiguration>) {
        this.defaultConfig = Object.assign(
            {
                allowConstReactive: true,
                interpretiveComments: true,
                reactivityMode: "reactive",
                whitespace: "trim-collapse",
                resolveImportExtension: true,
                preserveHtmlComments: "development"
            },
            value
        )
        this.clearCache()
    }

    resolve(filePath: string, onmessage?: HandleConfigParsingMessage) {
        const dir = this.path.dir(filePath)
        if (this.cache.has(dir)) {
            return this.cache.get(dir)!
        }

        let config: any
        let extendsPath: string
        const configPath = this.path.resolve(dir, ".qingkuairc")

        const cacheAndReturn = (value = {}) => {
            const ret = Object.assign(this.defaultConfig, value)
            return (this.cache.set(dir, ret), ret)
        }

        if (!this.fs.exist(configPath)) {
            return cacheAndReturn()
        }

        try {
            config = JSON.parse(this.fs.read(configPath))
        } catch {
            onmessage?.(configPath, {
                kind: ConfigParsingMessageKind.Error,
                value: `The configuration file content is not valid JSON.`
            })
        }

        if (!config?.extends) {
            return cacheAndReturn(config)
        }

        try {
            extendsPath = this.path.resolve(dir, config.extends)
        } catch {
            onmessage?.(configPath, {
                kind: ConfigParsingMessageKind.Warning,
                value: "Invalid extends field, ensure it's a valid file path."
            })
            return cacheAndReturn(config)
        }

        if (!this.fs.exist(extendsPath)) {
            onmessage?.(configPath, {
                kind: ConfigParsingMessageKind.Warning,
                value: `The file referenced by "extends" does not exist.`
            })
            return cacheAndReturn(config)
        }

        try {
            const extendsConfig = JSON.parse(this.fs.read(extendsPath))
            return cacheAndReturn(Object.assign(extendsConfig, config))
        } catch {
            onmessage?.(configPath, {
                kind: ConfigParsingMessageKind.Warning,
                value: `The configuration file content referenced by "extends" field is not valid JSON.`
            })
            return cacheAndReturn(config)
        }
    }
}
