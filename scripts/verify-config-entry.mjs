import nodeFs from "node:fs"
import nodeUrl from "node:url"
import nodePath from "node:path"
import nodeModule from "node:module"

// ./config 子路径的产物必须能独立加载，且不能引入语言服务主入口的依赖
const root = nodePath.dirname(nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url)))
const dist = nodePath.join(root, "packages/language-service/dist")
const esmPath = nodePath.join(dist, "config.js")
const cjsPath = nodePath.join(dist, "config.cjs")
const dtsPath = nodePath.join(dist, "config.d.ts")
const require = nodeModule.createRequire(import.meta.url)

function fail(message) {
    console.error(`[verify-config-entry] ${message}`)
    process.exit(1)
}

for (const filePath of [esmPath, cjsPath, dtsPath]) {
    if (!nodeFs.existsSync(filePath)) {
        fail(`${nodePath.relative(root, filePath)} is missing, run the build first`)
    }
}

const esm = await import(nodeUrl.pathToFileURL(esmPath).href)
if (typeof esm.createConfigResolver !== "function") {
    fail("config.js does not export createConfigResolver")
}

const cjs = require(cjsPath)
if (typeof (cjs.createConfigResolver ?? cjs.default?.createConfigResolver) !== "function") {
    fail("config.cjs does not export createConfigResolver")
}

// 裸包名说明产物把依赖带进来了，即使当前工作区恰好能解析到也要拦下
const specifierPatterns = [
    /(?:from|require\()\s*["']([^"']+)["']/g,
    /^\s*import\s*["']([^"']+)["']/gm
]
for (const filePath of [esmPath, cjsPath]) {
    const source = nodeFs.readFileSync(filePath, "utf-8")
    for (const pattern of specifierPatterns) {
        for (const match of source.matchAll(pattern)) {
            if (!match[1].startsWith(".")) {
                fail(
                    `${nodePath.basename(filePath)} imports "${match[1]}", the config entry must stay self-contained`
                )
            }
        }
    }
}

const declaration = nodeFs.readFileSync(dtsPath, "utf-8")
if (/^import\b/m.test(declaration) || /^export\b[^\n]*\bfrom\b/m.test(declaration)) {
    fail("config.d.ts must not import or re-export other type chunks")
}

console.log("[verify-config-entry] ok")
