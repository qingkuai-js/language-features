import { defineConfig } from "rollup"
import esbuild from "rollup-plugin-esbuild"
import commonjs from "@rollup/plugin-commonjs"
import { nodeResolve } from "@rollup/plugin-node-resolve"

export default defineConfig(() => {
    return [
        {
            external: ["vscode"],
            input: {
                client: "./packages/ext-vscode/index.ts",
                server: "./packages/language-server/index.ts"
            },
            output: {
                format: "cjs",
                dir: "dist",
                chunkFileNames: "chunks/[name].js"
            },
            plugins: [nodeResolve(), commonjs(), esbuild()],
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
                    console.log(log)
                    warn(log)
                }
            }
        }
    ]
})
