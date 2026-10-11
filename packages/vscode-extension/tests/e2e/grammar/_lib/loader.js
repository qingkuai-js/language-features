const fs = require("node:fs")
const path = require("node:path")
const tm = require("vscode-textmate")
const oniguruma = require("vscode-oniguruma")

const EXTENSION_ID = "qingkuai-tools.qingkuai-language-features"

// 扩展自带 grammar（相对扩展根目录）
const EXTENSION_GRAMMAR_FILES = {
    "source.qk": "syntaxes/qingkuai.tmLanguage.json",
    "source.qke": "syntaxes/qingkuai-emmet.tmLanguage.json",
    "source.css.postcss": "syntaxes/postcss.tmLanguage.json",
    "markdown.qingkuai.codeblock": "syntaxes/qingkuai-markdown-injection.json"
}

// 内嵌语法，取自 tm-grammars（VSCode 内建 grammar 的社区镜像，与测试窗口的
// VSCode 1.140 内建版本同源）。sass/stylus 在 VSCode 1.140 没有内建 grammar，
// 真实会话中 include 解析为空，这里同样不注册：注册任何会在零宽度 begin 位置
// 匹配的 grammar 都会触发 vscode-textmate 的 no-progress 保护弹出规则状态，
// 反而偏离真实行为。
const TM_GRAMMAR_FILES = {
    "source.ts": "typescript.json",
    "source.js": "javascript.json",
    "source.css": "css.json",
    "source.css.scss": "scss.json",
    "source.css.less": "less.json",
    "text.html.markdown": "markdown.json"
}

// typescript-basics 的 jsdoc 注入 grammar（298 字节，取自 VSCode 1.140.0，
// 与测试窗口同版本）。body 与 jsdoc.js.injection 完全一致（都引 source.ts#docblock），
// 一份同时服务 source.ts 与 source.js。
const VENDORED_INJECTION_FILES = {
    "documentation.injection.ts": "vendored/jsdoc.ts.injection.tmLanguage.json"
}

// package.json 声明的注入关系（injectTo），对应 tm.Registry 的 getInjections：
// scopeName → 注入它的 grammar scopeName 列表
const INJECTION_GRAPH = {
    "source.ts": ["documentation.injection.ts"],
    "source.js": ["documentation.injection.ts"],
    "text.html.markdown": ["markdown.qingkuai.codeblock"],
    "source.mdx": ["markdown.qingkuai.codeblock"]
}

/** 扩展根目录：扩展宿主内取被测扩展实例，纯 node（调试）走环境变量或相对路径 */
function resolveExtensionRoot() {
    if (process.env.QK_EXTENSION_ROOT) {
        return process.env.QK_EXTENSION_ROOT
    }
    try {
        const vscode = require("vscode")
        const ext = vscode.extensions.getExtension(EXTENSION_ID)
        if (!ext) {
            throw new Error(`extension ${EXTENSION_ID} should be present`)
        }
        return ext.extensionPath
    } catch (e) {
        if (e instanceof Error && e.message.includes(EXTENSION_ID)) {
            throw e
        }
        return path.join(__dirname, "..", "..", "..", "..")
    }
}

function readGrammar(scopeName) {
    const extensionRoot = resolveExtensionRoot()
    if (EXTENSION_GRAMMAR_FILES[scopeName]) {
        return JSON.parse(
            fs.readFileSync(path.join(extensionRoot, EXTENSION_GRAMMAR_FILES[scopeName]), "utf8")
        )
    }
    if (VENDORED_INJECTION_FILES[scopeName]) {
        return JSON.parse(
            fs.readFileSync(path.join(__dirname, VENDORED_INJECTION_FILES[scopeName]), "utf8")
        )
    }
    if (TM_GRAMMAR_FILES[scopeName]) {
        const req = require("module").createRequire(path.join(__dirname, "loader.js"))
        return req(`tm-grammars/grammars/${TM_GRAMMAR_FILES[scopeName]}`)
    }
    return null
}

let BOOT_PROMISE = null

/** 装配 registry 并预载全部 grammar；进程内只做一次 */
function boot() {
    if (!BOOT_PROMISE) {
        const wasmBin = fs.readFileSync(
            require.resolve("vscode-oniguruma/release/onig.wasm")
        ).buffer
        BOOT_PROMISE = oniguruma.loadWASM(wasmBin).then(async () => {
            const registry = new tm.Registry({
                onigLib: Promise.resolve({
                    createOnigScanner: sources => new oniguruma.OnigScanner(sources),
                    createOnigString: str => new oniguruma.OnigString(str)
                }),
                getInjections: scopeName => INJECTION_GRAPH[scopeName] || [],
                loadGrammar: readGrammar
            })
            const scopeNames = Object.keys(EXTENSION_GRAMMAR_FILES).concat(
                Object.keys(TM_GRAMMAR_FILES),
                Object.keys(VENDORED_INJECTION_FILES)
            )
            const grammars = {}
            for (const scopeName of scopeNames) {
                grammars[scopeName] = await registry.loadGrammar(scopeName)
            }
            return grammars
        })
    }
    return BOOT_PROMISE
}

/**
 * Token 化整个文档，跨行传递 ruleStack。切行语义与 VSCode TextModel 一致：
 * "\r\n" 与 "\n" 是换行（不进入行内容），孤立 "\r" 是普通字符。
 * 返回 [{ text, tokens: [{ startIndex, endIndex, scopes }] }]
 */
function tokenizeWith(grammar, text) {
    let ruleStack = tm.INITIAL
    return text.split(/\r\n|\n/).map(lineText => {
        const res = grammar.tokenizeLine(lineText, ruleStack)
        ruleStack = res.ruleStack
        return { text: lineText, tokens: res.tokens }
    })
}

/** 预载 grammar 并返回该 scopeName 的同步 tokenize 函数（气球断言用） */
async function getTokenizer(scopeName) {
    const grammars = await boot()
    const grammar = grammars[scopeName]
    if (!grammar) {
        throw new Error(`grammar not registered: ${scopeName}`)
    }
    return text => tokenizeWith(grammar, text)
}

/** scope 前缀匹配语义：b === a 或 b 以 "a." 开头 */
function scopeMatches(expected, scope) {
    return scope === expected || scope.startsWith(expected + ".")
}

/**
 * scope selector 是否由某条 token 产生。空格分隔的多段 selector（如
 * package.json tokenTypes 里的 "meta.import string.quoted"）要求各段
 * 按顺序出现在同一 token 的 scope 栈中。
 */
function selectorProduces(selector, scopesList) {
    const parts = selector.split(/\s+/)
    return scopesList.some(scopes => {
        let cursor = 0
        for (const scope of scopes) {
            if (cursor < parts.length && scopeMatches(parts[cursor], scope)) {
                cursor++
            }
        }
        return cursor === parts.length
    })
}

module.exports = {
    boot,
    getTokenizer,
    tokenizeWith,
    readGrammar,
    scopeMatches,
    selectorProduces,
    resolveExtensionRoot,
    EXTENSION_GRAMMAR_FILES,
    TM_GRAMMAR_FILES
}
