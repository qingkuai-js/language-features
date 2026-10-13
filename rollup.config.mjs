import fsExtra from "fs-extra"
import dts from "rollup-plugin-dts"
import json from "@rollup/plugin-json"
import esbuild from "rollup-plugin-esbuild"
import commonjs from "@rollup/plugin-commonjs"

import { defineConfig } from "rollup"
import { nodeResolve } from "@rollup/plugin-node-resolve"

// 会随扩展发布的产物（扩展本体、tsserver 插件、MCP 服务器）开启压缩：体积能明显减小，
// 代价是日志与堆栈里的函数名会被混淆（sourcemap 仍然生成，只是 .vsix 里不包含它们）。
// 语言服务产物不加压缩：它是发布到 npm 的库，需要保持可读。
// The artifacts shipped with the extension (the extension itself, the tsserver plugin, the MCP
// server) are minified: the size win is significant and the only cost is that function names in
// logs and stack traces get mangled (sourcemaps are still emitted, they are just not in the .vsix).
// The language-service output is left readable because it is published to npm as a library.
//
// 注意不要开启 esbuild 的 keepNames：它会把每个函数声明包成 __name(...) 调用，rollup 于是无法再判定
// 这些模块是死代码，qingkuai-language-service 整包都会被内联进 typescript-plugin（0.2 MB -> 1.5 MB）。
// Do not turn on esbuild's keepNames: it wraps every function in a __name(...) call, which makes
// rollup treat those modules as side-effectful, so the whole qingkuai-language-service package gets
// inlined into typescript-plugin (0.2 MB -> 1.5 MB).
const shippedCode = { minify: true }

// 把依赖各自分到固定名字的 chunk，产物里一眼能看出哪块是哪部分：语言服务（含它内联的 css
// 语言服务与 emmet）、LSP 协议栈、编辑器侧的 client、格式化插件；扩展与语言服务器自己的代码
// 仍由 rollup 决定（入口 chunk + 一个共用 chunk）
// Dependencies are grouped into fixed-name chunks so the payload shows what is what: the language
// service (including the css language service and emmet it inlines), the LSP stack, the editor-side
// client and the formatting plugin; the extension's and language server's own code is left to rollup
// (the two entry chunks plus one shared chunk).
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
        ["languageserver", "/vscode-languageserver", "/vscode-jsonrpc/", "/vscode-uri/"],
        ["languageclient", "/vscode-languageclient/"],
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

export default defineConfig(commandLineArgs => {
    const isWatchMode = !!commandLineArgs.watch
    const mcpServerExternal = ["qingkuai/compiler", "prettier", "prettier-plugin-qingkuai"]
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
                // 客户端与语言服务器共用的代码按职责拆成固定名字的 chunk，产物里一眼能看出
                // 哪块是哪个依赖（原先它们被合成一个 2.6 MB 的 chunks/shared.js）
                // The code shared by the client and the language server is split into fixed-name
                // chunks per responsibility, so the payload shows which dependency is which
                // (they all used to be merged into a single 2.6 MB chunks/shared.js).
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
            plugins: [nodeResolve(), commonjs(), esbuild(shippedCode)],
            input: "./packages/typescript-plugin/src/index.ts"
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
            // json 用于内联 @modelcontextprotocol/sdk 时处理 ajv 导入的 JSON schema 文件
            plugins: [
                nodeResolve(),
                commonjs(),
                json(),
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
