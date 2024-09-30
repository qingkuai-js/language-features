import { defineConfig } from "rollup"
import esbuild from "rollup-plugin-esbuild"
import commonjs from "@rollup/plugin-commonjs"
import { nodeResolve } from "@rollup/plugin-node-resolve"

export default defineConfig(() => {
    return [
        {
            external: ["vscode", "vscode-languageclient/node"],
            input: "./packages/ext-vscode/index.ts",
            output: {
                format: "cjs",
                file: "packages/ext-vscode/dist/index.js",
                chunkFileNames: "chunks/[name].js"
            },
            plugins: [esbuild()],
            onwarn: (log, warn) => {
                if (
                    !(
                        log.code === "CIRCULAR_DEPENDENCY" &&
                        log.ids.every(id => {
                            return id.includes("node_modules/.pnpm/semver")
                        })
                    )
                ) {
                    warn(log)
                }
            }
        },
        {
            external: [
                "@vscode/emmet-helper",
                "vscode-html-languageservice",
                "vscode-languageserver-textdocument"
            ],
            input: "./packages/language-server/index.ts",
            output: {
                format: "es",
                chunkFileNames: "chunks/[name].js",
                file: "packages/language-server/dist/index.js"
            },
            plugins: [esbuild(), commonjs(), nodeResolve()],
            onwarn: (log, warn) => {
                if (
                    !(
                        log.code === "CIRCULAR_DEPENDENCY" &&
                        log.ids.every(id => {
                            return id.includes("node_modules/.pnpm/semver")
                        })
                    )
                ) {
                    warn(log)
                }
            }
        }
    ]
})
