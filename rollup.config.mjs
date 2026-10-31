import fsExtra from "fs-extra"
import dts from "rollup-plugin-dts"
import json from "@rollup/plugin-json"
import esbuild from "rollup-plugin-esbuild"
import commonjs from "@rollup/plugin-commonjs"

import { defineConfig } from "rollup"
import { nodeResolve } from "@rollup/plugin-node-resolve"

export default defineConfig(commandLineArgs => {
    const shippedCode = { minify: true }
    const isWatchMode = !!commandLineArgs.watch
    const languageExternal = ["vscode", "prettier", "qingkuai/compiler"]
    const mcpServerExternal = ["qingkuai/compiler", "prettier", "prettier-plugin-qingkuai"]

    copyGrammarFiles()

    if (isWatchMode) {
        languageExternal.push(
            "@vscode/emmet-helper",
            "vscode-languageclient",
            "vscode-languageserver",
            "prettier-plugin-qingkuai",
            "vscode-languageclient/node",
            "vscode-languageserver/node",
            "vscode-css-languageservice",
            "vscode-languageserver-types",
            "vscode-languageserver-textdocument"
        )
    }

    const languageOnWarnAndExternal = {
        treeshake: {
            moduleSideEffects(id) {
                return !id.startsWith("node:")
            }
        },
        onwarn,
        external: languageExternal
    }

    const result = [
        // language service
        {
            input: {
                index: "./packages/language-service/src/index.ts",
                config: "./packages/language-service/src/config.ts",
                adapters: "./packages/language-service/src/adapters/index.ts"
            },
            output: {
                format: "es",
                sourcemap: true,
                chunkFileNames: "chunks/shared.js",
                dir: "./packages/language-service/dist"
            },
            ...languageOnWarnAndExternal,
            plugins: [nodeResolve(), commonjs(), esbuild(), reloadAsRaw()]
        },
        {
            input: {
                index: "./packages/language-service/src/index.ts",
                config: "./packages/language-service/src/config.ts",
                adapters: "./packages/language-service/src/adapters/adapter.ts"
            },
            output: {
                format: "cjs",
                sourcemap: true,
                entryFileNames: "[name].cjs",
                chunkFileNames: "chunks/shared.cjs",
                dir: "./packages/language-service/dist"
            },
            ...languageOnWarnAndExternal,
            plugins: [nodeResolve(), commonjs(), esbuild(), reloadAsRaw()]
        },

        // vscode extension and language server
        {
            input: {
                server: "./packages/language-server/src/index.ts",
                client: "./packages/vscode-extension/src/extension.ts"
            },
            output: {
                format: "cjs",
                sourcemap: true,
                chunkFileNames: "chunks/[name].js",
                dir: "packages/vscode-extension/dist",
                manualChunks: chunkNameOfDependency
            },
            ...languageOnWarnAndExternal,
            plugins: [nodeResolve(), commonjs(), esbuild(shippedCode)]
        },

        // typescript plugin
        {
            output: {
                format: "cjs",
                sourcemap: true,
                dir: "./packages/typescript-plugin/dist"
            },
            onwarn,
            external: ["qingkuai/compiler"],
            input: "./packages/typescript-plugin/src/index.ts",
            plugins: [nodeResolve(), commonjs(), esbuild(shippedCode)]
        },

        // mcp server
        {
            input: "./packages/mcp-server/src/index.ts",
            output: {
                format: "es",
                sourcemap: true,
                banner: "#!/usr/bin/env node",
                dir: "./packages/mcp-server/dist",
                entryFileNames: "index.mjs"
            },
            onwarn,
            external: mcpServerExternal,
            plugins: [
                nodeResolve(),
                commonjs(),
                json(), // 用于内联 @modelcontextprotocol/sdk 时处理 ajv 导入的 JSON schema 文件
                esbuild({ target: "esnext", ...shippedCode })
            ]
        }
    ]

    // language service types
    if (!isWatchMode) {
        result.push({
            input: {
                index: "./packages/language-service/dist/temp-types/packages/language-service/src/index.d.ts",
                adapters:
                    "./packages/language-service/dist/temp-types/packages/language-service/src/adapters/index.d.ts"
            },
            output: {
                format: "es",
                sourcemap: false,
                entryFileNames: "[name].d.ts",
                chunkFileNames: "chunks/shared.d.ts",
                dir: "./packages/language-service/dist"
            },
            plugins: [dts()],
            external: [...languageExternal, "node:fs", "node:path"]
        })

        // 单独打包配置类型，避免共享 chunk 把语言服务依赖的类型一并带入
        result.push({
            input: "./packages/language-service/dist/temp-types/packages/language-service/src/config.d.ts",
            output: {
                format: "es",
                sourcemap: false,
                file: "./packages/language-service/dist/config.d.ts"
            },
            plugins: [dts()],
            external: [...languageExternal, "node:fs", "node:path", "typescript"]
        })
    }

    return result
})

function onwarn(log, warn) {
    if (log.id && !log.id?.includes("node_modules")) {
        warn(log)
    }
}

function copyGrammarFiles() {
    const targetDir = "./packages/language-service/grammars"
    const sources = [
        "./packages/vscode-extension/syntaxes/qingkuai.tmLanguage.json",
        "./packages/vscode-extension/syntaxes/qingkuai-emmet.tmLanguage.json"
    ]

    fsExtra.ensureDirSync(targetDir)

    for (const source of sources) {
        const fileName = source.split("/").pop()
        fsExtra.copySync(source, `${targetDir}/${fileName}`, {
            overwrite: true
        })
    }
}

function reloadAsRaw() {
    return {
        name: "reload-as-raw",
        load(id) {
            if (id.endsWith("?raw")) {
                const content = fsExtra.readFileSync(id.slice(0, -4), "utf-8")
                return `export default ${JSON.stringify(content)}`
            }
        }
    }
}

function chunkNameOfDependency(id) {
    const normalized = id.replaceAll("\\", "/")
    const groups = [
        [
            "language-service",
            "/packages/language-service/",
            "/vscode-css-languageservice/",
            "/@vscode/emmet-helper/",
            "/emmet/",
            "/@emmetio/"
        ],
        ["language-server", "/vscode-languageserver", "/vscode-jsonrpc/", "/vscode-uri/"],
        ["language-client", "/vscode-languageclient/"],
        [
            "prettier-plugin",
            "/prettier-plugin-qingkuai/",
            "/prettier/",
            "/semver/",
            "/minimatch/",
            "/@babel/",
            "/lines-and-columns/"
        ]
    ]
    for (const [name, ...patterns] of groups) {
        if (patterns.some(pattern => normalized.includes(pattern))) {
            return name
        }
    }
    return undefined
}
