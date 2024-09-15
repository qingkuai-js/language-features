import { defineConfig } from "rollup"
import esbuild from "rollup-plugin-esbuild"
import commonjs from "@rollup/plugin-commonjs"
import { nodeResolve } from "@rollup/plugin-node-resolve"

export default defineConfig(() => {
    return {
        external: ["vscode"],
        input: {
            "ext-vscode/index": "./packages/ext-vscode/extension.ts",
            "language-server/index": "./packages/language-server/index.ts"
        },
        output: {
            dir: "dist",
            format: "es",
            chunkFileNames: "chunks/[name].js"
        },
        plugins: [
            esbuild({
                target: "esNext"
            }),
            commonjs(),
            nodeResolve()
        ],
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
})
