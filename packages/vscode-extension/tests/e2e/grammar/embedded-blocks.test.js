const nodeAssert = require("node:assert")
const { checkTokens } = require("./_lib/balloon")
const { getTokenizer } = require("./_lib/loader")

describe("grammar/embedded blocks", function () {
    let tokenize
    before(async function () {
        tokenize = await getTokenizer("source.qk")
    })

    it("tokenizes embedded js in lang-js and script blocks", function () {
        checkTokens(
            tokenize,
            `
                <lang-js>
                const a = 1;
                ^^^^^ source.js
                </lang-js>
                <script>
                let x = \`y \${z}\`;
                ^^^ source.js
                           ^^ punctuation.definition.template-expression.begin.js
                </script>
            `
        )
    })

    it("tokenizes template literals with html-like content inside js", function () {
        checkTokens(
            tokenize,
            `
                <lang-js>
                const t = \`<div>\${name}</div>\`;
                          ^ string.template.js
                                ^^ punctuation.definition.template-expression.begin.js
                </lang-js>
            `
        )
    })

    it("tokenizes jsdoc with curly braces inside embedded ts", function () {
        checkTokens(
            tokenize,
            `
                <lang-ts>
                /** doc {@link Foo} {braced} x */
                        ^ entity.name.type.instance.jsdoc
                         ^ punctuation.definition.inline.tag.jsdoc
                               ^^^ variable.other.description.jsdoc
                                  ^ punctuation.definition.bracket.curly.end.jsdoc
                const b = 2;
                ^^^^^ meta.embedded.block.qk
                </lang-ts>
            `
        )
    })

    it("tokenizes jsdoc block tags and tagged templates in embedded ts", function () {
        checkTokens(
            tokenize,
            `
                <lang-ts>
                /**
                 * @param {string} name the name
                   ^ punctuation.definition.block.tag.jsdoc
                           ^^^^^^ entity.name.type.instance.jsdoc
                                   ^^^^ variable.other.jsdoc
                 */
                function greet(name) {}
                const t = tag\`a\${x}b\`;
                          ^^^ entity.name.function.tagged-template.ts
                </lang-ts>
            `
        )
    })

    it("tokenizes import statements and jsdoc inside script blocks", function () {
        checkTokens(
            tokenize,
            `
                <script>
                /** {@link Bar} */
                import { foo } from "./bar";
                ^^^^^^ meta.import.js
                                     ^^^^^ string.quoted.double.js
                </script>
            `
        )
    })

    it("keeps qingkuai constructs inert inside embedded scripts", function () {
        checkTokens(
            tokenize,
            `
                <lang-js>
                const s = "<!-- not a comment -->";
                           ^^^^^^^^^^^^^^^^^^^^^^ string.quoted.double.js
                </lang-js>
            `
        )
        const doc = tokenize('<script>\nconst s = "</script>";\n</script>\n')
        // 字符串里的 </script> 不会终止嵌入块：整个字符串仍是 js 字符串，
        // 第三行的 </script> 才是块结束
        nodeAssert.ok(
            doc[1].tokens.some(
                t =>
                    t.startIndex === 11 &&
                    t.endIndex === 20 &&
                    t.scopes.includes("string.quoted.double.js")
            ),
            "expected '</script>' inside the string to stay a js string token"
        )
        nodeAssert.strictEqual(
            doc[2].tokens[0].scopes[doc[2].tokens[0].scopes.length - 1],
            "punctuation.definition.tag.begin.qk",
            "expected the third line to close the script block"
        )
    })

    it("terminates external style blocks at self-closing tags", function () {
        for (const tag of ["lang-css", "lang-scss"]) {
            const doc = tokenize(`<${tag} src="./common.css"/>\n<div>after</div>\n`)
            nodeAssert.ok(
                doc[0].tokens.some(t => t.scopes.includes("entity.other.attribute-name.html.qk")),
                `expected src on <${tag}/> to be tokenized as an attribute, not css`
            )
            nodeAssert.ok(
                doc[1].tokens.some(t => t.scopes.includes("meta.tag.normal.div.start.qk")),
                `expected the div after <${tag} src/> to be tokenized as a template tag`
            )
        }
    })

    it("tokenizes embedded css in lang-css and style blocks", function () {
        checkTokens(
            tokenize,
            `
                <lang-css>
                .a { color: red; }
                ^ punctuation.definition.entity.css
                 ^ entity.other.attribute-name.class.css
                            ^^^ support.constant.color.w3c-standard-color-name.css
                </lang-css>
                <style>
                #id { margin: 0 }
                ^ punctuation.definition.entity.css
                 ^^ entity.other.attribute-name.id.css
                </style>
            `
        )
    })

    it("tokenizes scss, less and postcss blocks", function () {
        checkTokens(
            tokenize,
            `
                <lang-scss>
                $a: 1;
                ^^ variable.scss
                </lang-scss>
                <lang-less>
                @c: 1px;
                ^ variable.other.readwrite.less
                </lang-less>
                <lang-postcss>
                .a { color: red; }
                ^ source.css.postcss
                </lang-postcss>
            `
        )
    })

    it("treats sass and stylus content as unhighlighted embedded text", function () {
        // VSCode 1.140 没有 sass/stylus 内建 grammar，真实会话中 include 解析
        // 为空、内容不加高亮。这里锁存该现状：内容是单 token、scope 栈止于
        // source.qk（不出现 meta.embedded / source.sass）。
        for (const [tag, content] of [
            ["lang-sass", ".a\n  color: red"],
            ["lang-stylus", ".a\n  color red"]
        ]) {
            const doc = tokenize(`<${tag}>\n${content}\n</${tag}>\n`)
            for (const line of [1, 2]) {
                const tokens = doc[line].tokens
                nodeAssert.strictEqual(
                    tokens.length,
                    1,
                    `expected one plain token on line ${line} of <${tag}>`
                )
                nodeAssert.strictEqual(
                    tokens[0].scopes[tokens[0].scopes.length - 1],
                    "source.qk",
                    `expected no inner grammar scope inside <${tag}>`
                )
            }
        }
    })
})
