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
const userArgs = process.argv.slice(2)
const TSCONFIG_SUITE_DIRS = new Set(["completions"])
const PROPOSALS_END = "Proceeding with EXTRA proposals"
const PROPOSALS_START = "appears in product.json but enables LESS API proposals"

const phaseNeedsTsconfig = args =>
    args.some(arg =>
        [...TSCONFIG_SUITE_DIRS].some(dir => new RegExp(`[\\\\/]${dir}[\\\\/]`).test(arg))
    )
const phases = userArgs.includes("--run")
    ? [{ name: "single", args: userArgs, env: phaseNeedsTsconfig(userArgs) }]
    : suiteDirectories().map(dir => ({
          name: dir.name,
          args: ["--run", ...dir.files, ...userArgs],
          env: TSCONFIG_SUITE_DIRS.has(dir.name)
      }))

let currentChild = null
for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => currentChild?.kill(signal))
}

let exitCode = 0
for (const phase of phases) {
    process.stdout.write(`\n===== [e2e] ${phase.name} =====\n`)
    exitCode = (await runPhase(phase.args, phase.env)) || exitCode
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

function runPhase(args, withTsconfig) {
    return new Promise(resolve => {
        const child = (currentChild = nodeChildProcess.spawn(process.execPath, [binMjs, ...args], {
            stdio: ["inherit", "pipe", "pipe"],
            env: {
                ...process.env,
                ...(withTsconfig ? { QK_E2E_TSCONFIG: "1" } : null)
            }
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
