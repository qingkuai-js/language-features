import fsExtra from "fs-extra"
import dts from "rollup-plugin-dts"
import esbuild from "rollup-plugin-esbuild"
import commonjs from "@rollup/plugin-commonjs"

import { defineConfig } from "rollup"
import { nodeResolve } from "@rollup/plugin-node-resolve"

export default defineConfig(commandLineArgs => {
    const isWatchMode = !!commandLineArgs.watch
    const languageExternal = ["vscode", "prettier", "qingkuai/compiler"]

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
                adapters: "./packages/language-service/src/adapters/adapter.ts"
            },
            output: {
                format: "cjs",
                sourcemap: true,
                entryFileNames:"[name].cjs",
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
                chunkFileNames: "chunks/shared.js",
                dir: "packages/vscode-extension/dist"
            },
            ...languageOnWarnAndExternal,
            plugins: [nodeResolve(), commonjs(), esbuild()]
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
            plugins: [nodeResolve(), commonjs(), esbuild()],
            input: "./packages/typescript-plugin/src/index.ts"
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
            external: languageExternal
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
