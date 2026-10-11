const fs = require("node:fs")
const path = require("node:path")
const nodeAssert = require("node:assert")
const yaml = require("js-yaml")

const {
    getTokenizer,
    readGrammar,
    scopeMatches,
    selectorProduces,
    resolveExtensionRoot,
    EXTENSION_GRAMMAR_FILES,
    TM_GRAMMAR_FILES
} = require("./_lib/loader")
const { KITCHEN_SINK } = require("./_lib/fixtures")

// embeddedLanguages 的值是 VSCode language id
const KNOWN_EMBEDDED_LANGUAGE_IDS = new Set([
    "jsdoc",
    "javascript",
    "typescript",
    "css",
    "sass",
    "stylus",
    "scss",
    "less",
    "markdown",
    "qingkuai"
])

// include 指向、但测试 registry 与 VSCode 1.140 都不提供的 scope（无内建
// grammar，真实会话中解析为空）
const OPTIONAL_INCLUDE_SCOPES = new Set(["source.sass", "source.stylus"])

const ALL_SCOPE_NAMES = new Set(
    Object.keys(EXTENSION_GRAMMAR_FILES).concat(Object.keys(TM_GRAMMAR_FILES))
)

function collectIncludes(node, includes) {
    if (Array.isArray(node)) {
        for (const item of node) {
            collectIncludes(item, includes)
        }
        return
    }
    if (node === null || typeof node !== "object") {
        return
    }
    if (typeof node.include === "string") {
        includes.push(node.include)
    }
    for (const [key, value] of Object.entries(node)) {
        if (key !== "include") {
            collectIncludes(value, includes)
        }
    }
}

describe("grammar/contribution consistency", function () {
    let manifest
    let extensionRoot
    let kitchenScopes

    before(async function () {
        extensionRoot = resolveExtensionRoot()
        manifest = JSON.parse(
            fs.readFileSync(path.join(extensionRoot, "package.json"), "utf8")
        )
        const tokenize = await getTokenizer("source.qk")
        kitchenScopes = tokenize(KITCHEN_SINK)
            .flatMap(line => line.tokens)
            .map(token => token.scopes)
    })

    it("declares well-formed grammar contributions in package.json", function () {
        const grammars = manifest.contributes.grammars
        nodeAssert.strictEqual(grammars.length, 4, "expected exactly 4 grammar contributions")

        const languageIds = new Set(manifest.contributes.languages.map(l => l.id))
        for (const grammar of grammars) {
            const grammarPath = path.join(extensionRoot, grammar.path)
            nodeAssert.ok(
                fs.existsSync(grammarPath),
                `grammar file should exist: ${grammar.path}`
            )
            nodeAssert.ok(grammar.scopeName, "scopeName should be set")
            if (grammar.language) {
                nodeAssert.ok(
                    languageIds.has(grammar.language),
                    `grammar language "${grammar.language}" should be a declared language id`
                )
            }
            for (const [scopeName, languageId] of Object.entries(
                grammar.embeddedLanguages || {}
            )) {
                nodeAssert.ok(
                    KNOWN_EMBEDDED_LANGUAGE_IDS.has(languageId),
                    `embeddedLanguages maps "${scopeName}" to unknown language id "${languageId}"`
                )
            }
        }

        const qingkuai = manifest.contributes.languages.find(l => l.id === "qingkuai")
        nodeAssert.ok(qingkuai, "qingkuai language should be declared")
        nodeAssert.ok(
            qingkuai.extensions.includes(".qk"),
            "qingkuai language should map the .qk extension"
        )
    })

    it("keeps compiled grammars in sync with their yaml sources", function () {
        for (const [name, source, compiled] of [
            [
                "qingkuai",
                "syntaxes/src/qingkuai.tmLanguage.yaml",
                "syntaxes/qingkuai.tmLanguage.json"
            ],
            [
                "qingkuai-emmet",
                "syntaxes/src/qingkuai-emmet.tmLanguage.yaml",
                "syntaxes/qingkuai-emmet.tmLanguage.json"
            ]
        ]) {
            const fromYaml = yaml.load(fs.readFileSync(path.join(extensionRoot, source), "utf8"))
            const fromJson = JSON.parse(
                fs.readFileSync(path.join(extensionRoot, compiled), "utf8")
            )
            nodeAssert.deepStrictEqual(
                fromYaml,
                fromJson,
                `${compiled} is stale — run "npm run build:grammars" after editing ${source}`
            )
        }
    })

    it("resolves every include in every owned grammar", function () {
        for (const [scopeName, file] of Object.entries(EXTENSION_GRAMMAR_FILES)) {
            const raw = JSON.parse(fs.readFileSync(path.join(extensionRoot, file), "utf8"))
            const includes = []
            collectIncludes(raw, includes)
            nodeAssert.ok(includes.length > 0, `${file} should have includes`)
            for (const include of includes) {
                if (include.startsWith("$")) {
                    continue
                }
                if (include.startsWith("#")) {
                    nodeAssert.ok(
                        raw.repository && raw.repository[include.slice(1)],
                        `${file}: unresolved include "${include}"`
                    )
                    continue
                }
                const hashIndex = include.indexOf("#")
                const targetScope =
                    hashIndex === -1 ? include : include.slice(0, hashIndex)
                const anchor = hashIndex === -1 ? null : include.slice(hashIndex + 1)

                if (OPTIONAL_INCLUDE_SCOPES.has(targetScope)) {
                    continue
                }
                nodeAssert.ok(
                    ALL_SCOPE_NAMES.has(targetScope),
                    `${file}: include "${include}" points at a scope the test registry cannot resolve`
                )
                if (anchor !== null) {
                    const targetRaw = readGrammar(targetScope)
                    nodeAssert.ok(
                        targetRaw && targetRaw.repository && targetRaw.repository[anchor],
                        `${file}: include "${include}" — no anchor "${anchor}" in ${targetScope}`
                    )
                }
            }
        }
    })

    it("produces every scope referenced by the tokenTypes contribution", function () {
        const tokenTypes = manifest.contributes.grammars.find(g => g.scopeName === "source.qk")
            .tokenTypes
        nodeAssert.ok(tokenTypes && Object.keys(tokenTypes).length > 0)
        for (const selector of Object.keys(tokenTypes)) {
            nodeAssert.ok(
                selectorProduces(selector, kitchenScopes),
                `tokenTypes selector "${selector}" is never produced by the tokenization of the kitchen-sink fixture`
            )
        }
    })

    it("produces every unbalancedBracketScopes entry", function () {
        const grammar = manifest.contributes.grammars.find(g => g.scopeName === "source.qk")
        const unbalanced = grammar.unbalancedBracketScopes
        nodeAssert.ok(unbalanced && unbalanced.length > 0)

        const produced = new Set()
        for (const scopes of kitchenScopes) {
            produced.add(scopes[scopes.length - 1])
            for (const scope of scopes) {
                produced.add(scope)
            }
        }
        const isProduced = selector =>
            [...produced].some(scope => scopeMatches(selector, scope))

        for (const selector of unbalanced) {
            nodeAssert.ok(
                isProduced(selector),
                `unbalancedBracketScopes entry "${selector}" is never produced by the tokenization of the kitchen-sink fixture`
            )
        }
    })
})
