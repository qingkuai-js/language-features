import nodeFs from "node:fs"
import nodePath from "node:path"
import nodeModule from "node:module"
import nodeUrl from "node:url"
import nodeChildProcess from "node:child_process"

const req = nodeModule.createRequire(import.meta.url)
const testCliEntry = req.resolve("@vscode/test-cli")
const testCliRoot = nodePath.dirname(nodePath.dirname(testCliEntry))
const binMjs = nodePath.join(testCliRoot, "out", "bin.mjs")
const extRoot = nodePath.dirname(nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url)))
const e2eRoot = nodePath.join(extRoot, "tests/e2e")

// 已知噪音族的行首特征
const NOISE_PREFIXES = [
    "[AgentHost",
    "[AgentHostProcessManager",
    "AgentHostProcessManager:",
    "[ChatModelSelection",
    "[CloudSandboxApi",
    "[RemoteAgentHost",
    "[AccountPolicyGate",
    "Unknown channel: agentHost"
]

const MAX_BLOCK_SKIP = 300
const PROPOSALS_END = "Proceeding with EXTRA proposals"
const PROPOSALS_START = "appears in product.json but enables LESS API proposals"

// 测试按功能目录分窗运行：每个目录单独起一个测试窗口（bin.mjs 每次调用都重新执行
// 配置模块，得到独立的扩展宿主/LS/tsserver/workspace 副本），目录间零共享，跨套件
// 干扰（LS/tsserver 重启窗口、负载拖垮预热 deadline）物理隔离；每窗整份拷贝
// _workspace，跨目录 fixture import（如 code-lens → navigation）保持可用。
// 单文件运行（--run 在场）保持单趟透传，便于调试单个套件；grep 类过滤原样透传到
// 每一窗（mocha 对零匹配退出码为 0，无 known 项的目录空跑一窗即通过）
const userArgs = process.argv.slice(2)
const phases = userArgs.includes("--run")
    ? [{ name: "single", args: userArgs }]
    : suiteDirectories().map(dir => ({
          name: dir.name,
          args: ["--run", ...dir.files, ...userArgs]
      }))

let currentChild = null
for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => currentChild?.kill(signal))
}

let exitCode = 0
for (const phase of phases) {
    process.stdout.write(`\n===== [e2e] ${phase.name} =====\n`)
    exitCode = (await runPhase(phase.args)) || exitCode
}
process.exit(exitCode)

function suiteDirectories() {
    return nodeFs
        .readdirSync(e2eRoot, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && entry.name !== "utils")
        .map(entry => {
            const dirPath = nodePath.join(e2eRoot, entry.name)
            return {
                name: entry.name,
                files: nodeFs
                    .readdirSync(dirPath)
                    .filter(name => name.endsWith(".test.js"))
                    .map(name => nodePath.join(dirPath, name))
            }
        })
        .filter(dir => dir.files.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name))
}

function runPhase(args) {
    return new Promise(resolve => {
        const child = (currentChild = nodeChildProcess.spawn(process.execPath, [binMjs, ...args], {
            stdio: ["inherit", "pipe", "pipe"]
        }))
        pipeFiltered(child.stdout, process.stdout)
        pipeFiltered(child.stderr, process.stderr)
        child.on("exit", (code, signal) => {
            currentChild = null
            if (signal) {
                process.kill(process.pid, signal)
            }
            resolve(code ?? 0)
        })
    })
}

function pipeFiltered(source, sink) {
    let buffered = ""
    let skipping = false
    let skipped = 0
    source.setEncoding("utf8")
    source.on("data", chunk => {
        buffered += chunk
        let newlineAt = buffered.indexOf("\n")
        while (newlineAt !== -1) {
            const line = buffered.slice(0, newlineAt)
            buffered = buffered.slice(newlineAt + 1)
            newlineAt = buffered.indexOf("\n")
            if (line.includes(PROPOSALS_START)) {
                skipping = true
                skipped = 0
                continue
            }
            if (skipping) {
                skipped++
                if (line.includes(PROPOSALS_END) || skipped > MAX_BLOCK_SKIP) {
                    skipping = false
                }
                continue
            }
            if (NOISE_PREFIXES.some(prefix => line.startsWith(prefix))) {
                continue
            }
            sink.write(line + "\n")
        }
    })
    source.on("end", () => {
        if (!skipping && !NOISE_PREFIXES.some(prefix => buffered.startsWith(prefix))) {
            sink.write(buffered)
        }
    })
}
