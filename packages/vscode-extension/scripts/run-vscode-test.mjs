import nodeFs from "node:fs"
import nodeUrl from "node:url"
import nodePath from "node:path"
import nodeUtil from "node:util"
import nodeModule from "node:module"
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
    "Unknown channel: agentHost",
    "NativeExtensionHostFactory.",
    "filterEnabledExtensions:"
]

// 已知噪音族的行首特征正则
const NOISE_PATTERNS = [
    /^\[main [^\]]+\] (?:StorageMainService|AgentHostProcessManager): /,
    /^\[main [^\]]+\] update#\w+ /,
    /^\[main [^\]]+\] \[(?:node-compile-cache|shared storage|AgentHost:stderr)\] /,
    /^workbench#open\(\)\s*$/,
    /^Started local extension host with pid \d+\.\s*$/,
    /^IExtensionHostStarter\.start\(\) took \d+ ms\.\s*$/,
    /^Loading development extension at /,
    /^Settings Sync: Account status changed from /,
    /^\(node:\d+\) \[DEP0169\]/,
    /^\(Use .+--trace-deprecation /
]

const isNoise = line => {
    const plain = nodeUtil.stripVTControlCharacters(line)
    return (
        NOISE_PREFIXES.some(prefix => plain.startsWith(prefix)) ||
        NOISE_PATTERNS.some(pattern => pattern.test(plain))
    )
}

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
    ? [
          {
              name: "single",
              args: userArgs,
              files: [],
              env: phaseNeedsTsconfig(userArgs),
              checkEmpty: false
          }
      ]
    : suiteDirectories().map(dir => ({
          name: dir.name,
          files: dir.files,
          args: ["--run", ...dir.files, ...userArgs],
          env: TSCONFIG_SUITE_DIRS.has(dir.name),
          checkEmpty: true
      }))

let currentChild = null
for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => currentChild?.kill(signal))
}

let exitCode = 0
for (const phase of phases) {
    if (phase.checkEmpty) {
        // 标记数不为 0 时会被 --grep @known-bug --invert 排除，打印出来便于发现误标
        const markers = countKnownBugMarkers(phase.files)
        process.stdout.write(
            markers
                ? `[e2e] ${phase.name}: ${markers} @known-bug marker(s) will be excluded\n`
                : `[e2e] ${phase.name}: no @known-bug cases\n`
        )
    }
    process.stdout.write(`\n===== [e2e] ${phase.name} =====\n`)
    exitCode = (await runPhase(phase)) || exitCode
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

// 统计该窗口文件里的 @known-bug 标记数，避免误标导致用例被静默排除
function countKnownBugMarkers(files) {
    let count = 0
    for (const file of files) {
        count += nodeFs.readFileSync(file, "utf8").split("@known-bug").length - 1
    }
    return count
}

function runPhase(phase) {
    return new Promise(resolve => {
        let passing = 0
        const child = (currentChild = nodeChildProcess.spawn(
            process.execPath,
            [binMjs, ...phase.args],
            {
                stdio: ["inherit", "pipe", "pipe"],
                env: {
                    ...process.env,
                    ...(phase.env ? { QK_E2E_TSCONFIG: "1" } : null)
                }
            }
        ))
        const onLine = line => {
            const matched = nodeUtil.stripVTControlCharacters(line).match(/(\d+)\s+passing/)
            if (matched) {
                passing = Math.max(passing, Number(matched[1]))
            }
        }
        pipeFiltered(child.stdout, process.stdout, onLine)
        pipeFiltered(child.stderr, process.stderr)
        child.on("exit", (code, signal) => {
            currentChild = null
            if (signal) {
                process.kill(process.pid, signal)
            }

            let exit = code ?? 0
            if (!signal && exit === 0 && phase.checkEmpty && passing === 0) {
                process.stderr.write(
                    `[e2e] ${phase.name}: no tests ran, check the test file placement and the .test.js suffix\n`
                )
                exit = 1
            }
            resolve(exit)
        })
    })
}

function pipeFiltered(source, sink, onLine) {
    let skipped = 0
    let buffered = ""
    let skipping = false
    source.setEncoding("utf8")
    source.on("data", chunk => {
        buffered += chunk
        let newlineAt = buffered.indexOf("\n")
        while (newlineAt !== -1) {
            const line = buffered.slice(0, newlineAt)
            buffered = buffered.slice(newlineAt + 1)
            newlineAt = buffered.indexOf("\n")
            onLine?.(line)

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
            if (isNoise(line)) {
                continue
            }
            sink.write(line + "\n")
        }
    })
    source.on("end", () => {
        if (!skipping && !isNoise(buffered)) {
            sink.write(buffered)
        }
    })
}
