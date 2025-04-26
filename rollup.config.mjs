import dts from "rollup-plugin-dts"
import { defineConfig } from "rollup"
import esbuild from "rollup-plugin-esbuild"
import commonjs from "@rollup/plugin-commonjs"
import { nodeResolve } from "@rollup/plugin-node-resolve"

export default defineConfig(commandLineArgs => {
    const isWatchMode = !!commandLineArgs.watch
    const languageExternal = [
        "vscode",
        "prettier",
        "qingkuai",
        "qingkuai/compiler",
        "qingkuai/internal"
    ]

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
        external: languageExternal,

        // ignore known warnings that don't matter
        onwarn: (log, warn) => {
            if (
                !(
                    log.code === "CIRCULAR_DEPENDENCY" &&
                    log.ids.every(id => {
                        return id.includes("node_modules/.pnpm/semver")
                    })
                ) &&
                !(
                    log.code === "THIS_IS_UNDEFINED" &&
                    /emmetHelper\.js|vscode-uri\/lib\/esm\/index.js/.test(log.id)
                )
            ) {
                warn(log)
            }
        },

        treeshake: {
            moduleSideEffects(id) {
                return !id.startsWith("node:")
            }
        }
    }

    const result = [
        // language service
        {
            ...languageOnWarnAndExternal,
            input: "./packages/language-service/src/index.ts",
            output: {
                format: "es",
                sourcemap: true,
                entryFileNames: "index.js",
                dir: "./packages/language-service/dist"
            },
            plugins: [nodeResolve(), commonjs(), esbuild()]
        },
        {
            ...languageOnWarnAndExternal,
            input: "./packages/language-service/src/index.ts",
            output: {
                format: "cjs",
                entryFileNames: "index.cjs",
                dir: "./packages/language-service/dist"
            },
            plugins: [nodeResolve(), commonjs(), esbuild()]
        },
        {
            ...languageOnWarnAndExternal,
            input: "./packages/language-service/src/adapters/index.ts",
            output: {
                format: "es",
                sourcemap: true,
                entryFileNames: "adapters.js",
                dir: "./packages/language-service/dist"
            },
            plugins: [nodeResolve(), commonjs(), esbuild()]
        },
        {
            ...languageOnWarnAndExternal,
            input: "./packages/language-service/src/adapters/index.ts",
            output: {
                format: "cjs",
                entryFileNames: "adapters.cjs",
                dir: "./packages/language-service/dist"
            },
            plugins: [nodeResolve(), commonjs(), esbuild()]
        },

        // vscode extension and language server
        {
            ...languageOnWarnAndExternal,
            input: {
                server: "./packages/language-server/src/index.ts",
                client: "./packages/vscode-extension/src/index.ts"
            },
            output: {
                format: "cjs",
                sourcemap: true,
                chunkFileNames: "chunks/[name].js",
                dir: "packages/vscode-extension/dist"
            },
            plugins: [nodeResolve(), commonjs(), esbuild()]
        },

        // typescript plugin
        {
            external: ["qingkuai/compiler"],
            input: "./packages/typescript-plugin/src/index.ts",
            output: {
                format: "cjs",
                sourcemap: true,
                dir: "./packages/typescript-plugin/dist"
            },
            plugins: [nodeResolve(), commonjs(), esbuild()]
        }
    ]

    // language service types
    if (!isWatchMode) {
        result.push(
            {
                external: languageExternal,
                input: "./packages/language-service/dist/temp-types/packages/language-service/src/index.d.ts",
                output: {
                    format: "es",
                    entryFileNames: "index.d.ts",
                    dir: "./packages/language-service/dist"
                },
                plugins: [dts()]
            },
            {
                external: languageExternal,
                input: "./packages/language-service/dist/temp-types/packages/language-service/src/adapters/index.d.ts",
                output: {
                    format: "es",
                    entryFileNames: "adapters.d.ts",
                    dir: "./packages/language-service/dist"
                },
                plugins: [dts()]
            }
        )
    }

    return result
})
