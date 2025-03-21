import { defineConfig } from "rollup"
import esbuild from "rollup-plugin-esbuild"
import commonjs from "@rollup/plugin-commonjs"
import { nodeResolve } from "@rollup/plugin-node-resolve"

export default defineConfig(options => {
    const clientAndServerExternal = ["vscode", "prettier", "qingkuai/compiler"]

    if (!!options.watch) {
        clientAndServerExternal.push(
            "@vscode/emmet-helper",
            "vscode-languageclient",
            "vscode-languageserver",
            "prettier-plugin-qingkuai",
            "vscode-languageclient/node",
            "vscode-languageserver/node",
            "vscode-languageserver-textdocument"
        )
    }

    return [
        // vscode extension and language server
        {
            external: clientAndServerExternal,
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
            plugins: [nodeResolve(), commonjs(), esbuild()],

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
            }
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
})
