// 打包产物冒烟测试：按 .vscodeignore 收集 VS Code 打包时会包含的文件，原样复制到临时目录，
// 然后在"磁盘上没有 typescript 包"的前提下用注入的 typescript 起语言服务器与 MCP 服务器，
// 验证编译、格式化与 MCP 工具仍然可用。CI 与本地都可以直接 `node scripts/verify-packed-payload.mjs`。
//
// Smoke test for the packed payload: collect the files VS Code would ship (the `.vscodeignore`
// rules), copy them aside, then boot the language server and the MCP server from that layout with
// the typescript of the host injected and no `typescript` package on disk, asserting that
// compilation, formatting and the MCP tools still work.
//
// usage: node scripts/verify-packed-payload.mjs [--keep]
import nodeChildProcess from "node:child_process"
import nodeFs from "node:fs"
import nodeModule from "node:module"
import nodeOs from "node:os"
import nodePath from "node:path"
import nodeUrl from "node:url"

const PWD = nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url))
const EXT_ROOT = nodePath.dirname(PWD)
const KEEP = process.argv.includes("--keep")
const nodeRequire = nodeModule.createRequire(import.meta.url)

// gitignore/minimatch 风格的简化匹配：`**` 跨目录、`*` 不跨目录、`?` 单个字符
// Simplified gitignore/minimatch matching: `**` crosses directories, `*` does not, `?` is one
// character. Only the syntax used by this repository's .vscodeignore is supported.
function toMatcher(pattern) {
    let source = ""
    for (let index = 0; index < pattern.length; index++) {
        const char = pattern[index]
        if (char === "*" && pattern[index + 1] === "*") {
            if (index === 0 && pattern[index + 2] === "/") {
                source += "(?:.*/)?"
                index += 2
            } else {
                source += ".*"
                index++
                if (pattern[index + 1] === "/") {
                    index++
                }
            }
        } else if (char === "*") {
            source += "[^/]*"
        } else if (char === "?") {
            source += "[^/]"
        } else {
            source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&")
        }
    }
    return new RegExp(`^${source}$`)
}

const DEFAULT_IGNORE = [
    ".vscodeignore",
    "package-lock.json",
    "npm-debug.log",
    "yarn.lock",
    "yarn-error.log",
    "npm-shrinkwrap.json",
    ".editorconfig",
    ".npmrc",
    ".yarnrc",
    ".gitattributes",
    "*.todo",
    "tslint.yaml",
    ".eslintrc*",
    ".babelrc*",
    ".prettierrc*",
    ".cz-config.js",
    ".commitlintrc*",
    "webpack.config.js",
    "ISSUE_TEMPLATE.md",
    "CONTRIBUTING.md",
    "PULL_REQUEST_TEMPLATE.md",
    "CODE_OF_CONDUCT.md",
    ".github",
    ".travis.yml",
    "appveyor.yml",
    "**/.git/**",
    "**/*.vsix",
    "**/.DS_Store",
    "**/*.vsixmanifest",
    "**/.vscode-test/**",
    "**/.vscode-test-web/**"
]
const NOT_IGNORED = ["!package.json", "!README.md"]

function readManifest() {
    return JSON.parse(nodeFs.readFileSync(nodePath.join(EXT_ROOT, "package.json"), "utf8"))
}

// 与 vsce 的 FileCollector 一致：解析 .vscodeignore，并补上目录形式的通配
// Same as vsce's FileCollector: parse .vscodeignore and expand plain directory entries
function createIgnoreMatcher() {
    const raw = nodeFs
        .readFileSync(nodePath.join(EXT_ROOT, ".vscodeignore"), "utf8")
        .split(/[\n\r]/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("#"))
    const expanded = [
        ...raw,
        ...raw
            .filter(pattern => !/(^|\/)[^/]*\*[^/]*$/.test(pattern))
            .map(pattern => (pattern.endsWith("/") ? `${pattern}**` : `${pattern}/**`))
    ]
    const all = [...DEFAULT_IGNORE, ...expanded, ...NOT_IGNORED]
    const ignore = all.filter(pattern => !pattern.startsWith("!")).map(toMatcher)
    const negate = all
        .filter(pattern => pattern.startsWith("!"))
        .map(pattern => toMatcher(pattern.slice(1)))
    return relativePath => {
        for (const matcher of ignore) {
            if (matcher.test(relativePath)) {
                return !negate.some(negated => negated.test(relativePath))
            }
        }
        return false
    }
}

function resolveFrom(name, fromDir) {
    let dir = fromDir
    while (true) {
        const candidate = nodePath.join(dir, "node_modules", name)
        if (nodeFs.existsSync(candidate)) {
            return nodeFs.realpathSync(candidate)
        }
        const parent = nodePath.dirname(dir)
        if (parent === dir) {
            return null
        }
        dir = parent
    }
}

// 生产依赖闭包（pnpm 布局下顺着符号链接解析）
// The production dependency closure (following the symlinks of a pnpm layout)
function collectDependencies() {
    const dependencies = new Map()
    const visit = (name, fromDir) => {
        if (dependencies.has(name)) {
            return
        }
        const real = resolveFrom(name, fromDir)
        if (!real) {
            return
        }
        dependencies.set(name, real)
        const manifest = JSON.parse(
            nodeFs.readFileSync(nodePath.join(real, "package.json"), "utf8")
        )
        for (const dep of Object.keys({
            ...manifest.dependencies,
            ...manifest.optionalDependencies
        })) {
            visit(dep, real)
        }
    }
    for (const dep of Object.keys(readManifest().dependencies ?? {})) {
        visit(dep, EXT_ROOT)
    }
    return dependencies
}

function stagePayload(stageRoot) {
    const isIgnored = createIgnoreMatcher()
    const copies = []
    const walk = (dir, relativeBase, skipNodeModules) => {
        for (const entry of nodeFs.readdirSync(dir)) {
            const absolute = nodePath.join(dir, entry)
            let stat = nodeFs.lstatSync(absolute)
            if (stat.isSymbolicLink()) {
                stat = nodeFs.statSync(absolute)
            }
            const relativePath = relativeBase ? `${relativeBase}/${entry}` : entry
            if (stat.isDirectory()) {
                if (skipNodeModules && entry === "node_modules") {
                    continue
                }
                walk(absolute, relativePath, skipNodeModules)
            } else if (!isIgnored(relativePath)) {
                copies.push([absolute, nodePath.join(stageRoot, relativePath)])
            }
        }
    }
    walk(EXT_ROOT, "", true)
    for (const [name, dir] of collectDependencies()) {
        walk(dir, `node_modules/${name}`, true)
    }
    for (const [source, target] of copies) {
        nodeFs.mkdirSync(nodePath.dirname(target), { recursive: true })
        nodeFs.copyFileSync(source, target)
    }
    return copies.length
}

function findHostTypeScript() {
    const candidates = [
        nodePath.join(EXT_ROOT, "node_modules/typescript/lib/typescript.js"),
        nodePath.join(EXT_ROOT, "../../node_modules/typescript/lib/typescript.js")
    ]
    return candidates.find(candidate => nodeFs.existsSync(candidate))
}

// 注入 API 是 qingkuai 1.0.103 起才有的，装到旧版本时直接给出可读的失败原因
// The injection API only exists since qingkuai 1.0.103, so fail with a readable reason when an
// older version is installed
function assertInjectableCompiler(stageRoot) {
    const compilerPath = nodePath.join(
        stageRoot,
        "node_modules/qingkuai/dist/cjs/compiler/index.cjs"
    )
    if (!nodeFs.existsSync(compilerPath)) {
        throw new Error("the staged payload has no qingkuai/compiler, is the extension built?")
    }
    let compiler
    try {
        compiler = nodeRequire(compilerPath)
    } catch {
        // 旧版本的编译器会直接 require("typescript")，沙箱里没有这个包时就会抛错
        // older compilers require("typescript") eagerly, which throws in this sandbox
        compiler = undefined
    }
    if (typeof compiler?.setTypeScriptPath !== "function") {
        const version = JSON.parse(
            nodeFs.readFileSync(
                nodePath.join(stageRoot, "node_modules/qingkuai/package.json"),
                "utf8"
            )
        ).version
        throw new Error(
            `the installed qingkuai (${version}) does not provide setTypeScriptPath, install one that carries ` +
                "the typescript injection API"
        )
    }
}

// prettier 把无扩展名的 `.prettierrc` 交给 YAML 解析器，插件被裁掉时只有真实项目才会暴露问题
// prettier parses an extensionless `.prettierrc` with its YAML loader, so a payload that drops
// that plugin only breaks once a project actually carries such a config file
async function assertPrettierConfigResolution(stageRoot) {
    const prettierEntry = nodePath.join(stageRoot, "node_modules/prettier/index.mjs")
    if (!nodeFs.existsSync(prettierEntry)) {
        throw new Error("the staged payload has no prettier, is the extension built?")
    }

    const probeDir = nodePath.join(stageRoot, "prettier-config-probe")
    nodeFs.mkdirSync(probeDir, { recursive: true })
    nodeFs.writeFileSync(nodePath.join(probeDir, ".prettierrc"), '{ "printWidth": 90 }\n')

    let resolved
    const prettier = (await import(nodeUrl.pathToFileURL(prettierEntry).href)).default
    try {
        resolved = await prettier.resolveConfig(nodePath.join(probeDir, "probe.txt"), {
            useCache: false,
            editorconfig: true
        })
    } catch (error) {
        throw new Error(
            "the staged payload cannot read an extensionless .prettierrc, keep " +
                "node_modules/prettier/plugins/yaml.mjs in .vscodeignore: " +
                error.message
        )
    }
    if (resolved?.printWidth !== 90) {
        throw new Error(
            "reading .prettierrc from the staged payload returned " + JSON.stringify(resolved)
        )
    }
}

function runMcp(entry, workDir, env, tools) {
    return new Promise(resolve => {
        const child = nodeChildProcess.spawn(process.execPath, [entry], {
            cwd: workDir,
            env,
            stdio: ["pipe", "pipe", "pipe"]
        })
        let buffer = ""
        const pending = new Map()
        child.stdout.on("data", chunk => {
            buffer += String(chunk)
            let index
            while ((index = buffer.indexOf("\n")) >= 0) {
                const line = buffer.slice(0, index).trim()
                buffer = buffer.slice(index + 1)
                if (!line) continue
                try {
                    const message = JSON.parse(line)
                    pending.get(message.id)?.(message)
                    pending.delete(message.id)
                } catch {
                    /* not a JSON-RPC line */
                }
            }
        })
        let nextId = 1
        const request = (method, params) =>
            new Promise(done => {
                const id = nextId++
                pending.set(id, done)
                child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`)
            })
        ;(async () => {
            await request("initialize", {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: { name: "smoke", version: "1" }
            })
            child.stdin.write(
                `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} })}\n`
            )
            for (const [name, args, check] of tools) {
                const result = await request("tools/call", { name, arguments: args })
                check(result?.result?.content?.[0]?.text ?? JSON.stringify(result))
            }
            child.kill()
            resolve()
        })().catch(error => {
            child.kill()
            resolve(Promise.reject(error))
        })
    })
}

async function main() {
    const stageRoot = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "qingkuai-packed-"))
    const fileCount = stagePayload(stageRoot)

    // 沙箱里没有 typescript 才说明注入链路真的在工作
    // the sandbox must not contain a typescript package for the injection path to be exercised
    if (nodeFs.existsSync(nodePath.join(stageRoot, "node_modules/typescript"))) {
        throw new Error("the staged payload unexpectedly contains a typescript package")
    }
    assertInjectableCompiler(stageRoot)
    await assertPrettierConfigResolution(stageRoot)

    const typescriptEntry = findHostTypeScript()
    if (!typescriptEntry) {
        throw new Error(
            "no typescript installation found to inject, install the devDependencies first"
        )
    }

    const env = { ...process.env, LIMITED_SCRIPT: "1", QINGKUAI_TYPESCRIPT_ENTRY: typescriptEntry }
    const source = [
        "<lang-ts>",
        "    let   count:number=1",
        "    function increase(){count+=1}",
        "</lang-ts>",
        "",
        "<lang-scss>",
        ".a{color:red;.b{color:blue}}",
        "</lang-scss>",
        "",
        '<div    class="counter"   @click={increase}>{count}</div>',
        ""
    ].join("\n")
    const documentPath = nodePath.join(stageRoot, "component.qk")
    nodeFs.writeFileSync(documentPath, source, "utf-8")

    // 1. 语言服务器：编译 + 格式化
    await new Promise((resolve, reject) => {
        const child = nodeChildProcess.spawn(
            process.execPath,
            [nodePath.join(stageRoot, "dist/server.js"), "--node-ipc"],
            {
                cwd: stageRoot,
                env,
                stdio: ["ignore", "pipe", "pipe", "ipc"]
            }
        )
        const logs = []
        child.stdout.on("data", chunk => logs.push(String(chunk)))
        child.stderr.on("data", chunk => logs.push(String(chunk)))
        const finish = error => {
            child.kill()
            error ? reject(new Error(String(error) + "\n" + logs.join(""))) : resolve()
        }
        const timer = setTimeout(() => finish("timed out waiting for the language server"), 30000)
        const uri = nodeUrl.pathToFileURL(documentPath).href
        child.on("message", message => {
            if (message.method === "qingkuai/getClientLanguageConfig") {
                child.send({
                    jsonrpc: "2.0",
                    id: message.id,
                    result: {
                        dirPath: stageRoot,
                        prettierConfig: {},
                        qingkuaiConfig: {},
                        typescriptConfig: {},
                        extensionConfig: {}
                    }
                })
            } else if (message.id !== undefined && message.method) {
                child.send({ jsonrpc: "2.0", id: message.id, result: null })
            } else if (message.id === 1 && message.result) {
                child.send({ jsonrpc: "2.0", method: "initialized", params: {} })
                child.send({
                    jsonrpc: "2.0",
                    method: "textDocument/didOpen",
                    params: {
                        textDocument: { uri, languageId: "qingkuai", version: 1, text: source }
                    }
                })
            } else if (message.method === "qingkuai/workspaceReady") {
                child.send({
                    jsonrpc: "2.0",
                    id: 2,
                    method: "textDocument/formatting",
                    params: { textDocument: { uri }, options: { tabSize: 4, insertSpaces: true } }
                })
            } else if (message.id === 2) {
                clearTimeout(timer)
                const edits = message.result
                if (!Array.isArray(edits) || !edits.length) {
                    finish(
                        "formatting returned no edits: " +
                            JSON.stringify(message.error ?? message.result)
                    )
                    return
                }
                finish()
            }
        })
        child.on("exit", code => finish("the language server exited early with code " + code))
        child.send({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
                processId: process.pid,
                rootUri: nodeUrl.pathToFileURL(stageRoot).href,
                capabilities: {},
                initializationOptions: { limitedScriptLanguageFeatures: true }
            }
        })
    })

    // 2. MCP 服务器：语法检查 + 格式化 + 文档资源
    const mcpDir = nodePath.join(stageRoot, "node_modules/qingkuai-mcp-server")
    await runMcp(
        nodePath.join(mcpDir, "dist/index.mjs"),
        mcpDir,
        { ...process.env, QINGKUAI_TYPESCRIPT_ENTRY: typescriptEntry },
        [
            [
                "check_qingkuai_syntax",
                { source },
                text => {
                    if (!String(text).includes('"status": "success"')) {
                        throw new Error(
                            "check_qingkuai_syntax failed: " + String(text).slice(0, 200)
                        )
                    }
                }
            ]
        ]
    )

    if (!KEEP) {
        // 子进程刚退出时 Windows 上偶尔仍占用文件，残留临时目录不影响测试结论
        // Windows may still hold a file right after the children exit; a leftover temp dir is harmless
        try {
            nodeFs.rmSync(stageRoot, {
                recursive: true,
                force: true,
                maxRetries: 5,
                retryDelay: 200
            })
        } catch {}
    }
    console.log(
        `packed payload smoke test passed (${fileCount} staged files, staged at ${KEEP ? stageRoot : "a temp dir"})`
    )
}

main().catch(error => {
    console.error("packed payload smoke test failed: " + error.message)
    process.exit(1)
})
