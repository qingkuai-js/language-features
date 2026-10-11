const { checkTokens } = require("./_lib/balloon")
const { getTokenizer } = require("./_lib/loader")

describe("grammar/template tokenization", function () {
    let tokenize
    before(async function () {
        tokenize = await getTokenizer("source.qk")
    })

    it("tokenizes normal and void tags", function () {
        checkTokens(
            tokenize,
            `
                <div>hello</div>
                ^ punctuation.definition.tag.begin.qk
                 ^^^ entity.name.tag.qk
                    ^ punctuation.definition.tag.end.qk
                     ^^^^^ text
                          ^^ punctuation.definition.tag.begin.qk
                            ^^^ entity.name.tag.qk
                               ^ punctuation.definition.tag.end.qk
                <input disabled>
                 ^^^^^ entity.name.tag.qk
                       ^^^^^^^^ entity.other.attribute-name.html.qk
                <br/>
                 ^^ entity.name.tag.qk
            `
        )
    })

    it("distinguishes lowercase native tags from component tags", function () {
        checkTokens(
            tokenize,
            `
                <ab></ab>
                 ^^ entity.name.tag.qk
                <a-b></a-b>
                 ^^^ support.function.component.qk
                <a.b></a.b>
                 ^^^ support.function.component.qk
                <my_tag1></my_tag1>
                 ^^^^^^^ entity.name.tag.qk
                <h1>t</h1>
                 ^^ entity.name.tag.qk
            `
        )
    })

    it("tokenizes component tags with type parameters", function () {
        checkTokens(
            tokenize,
            `
                <Comp<string>></Comp>
                 ^^^^ support.function.component.qk
                     ^ punctuation.definition.type-parameters.begin.qk
                      ^^^^^^ meta.type.parameters.qk
                            ^ punctuation.definition.type-parameters.end.qk
                             ^ punctuation.definition.tag.end.qk
                <Comp<Array<string>>></Comp>
                      ^^^^^ meta.type.parameters.qk
            `
        )
    })

    it("tokenizes the qk:spread tag", function () {
        checkTokens(
            tokenize,
            `
                <qk:spread/>
                 ^^^^^^^^^ entity.name.tag.qk
            `
        )
    })

    it("tokenizes attributes with quoted values and character entities", function () {
        checkTokens(
            tokenize,
            `
                <img src="a.png" title='a&amp;b' hidden>
                 ^^^ entity.name.tag.qk
                     ^^^ entity.other.attribute-name.html.qk
                          ^^^^^ string.quoted.double.qk
                                 ^^^^^ entity.other.attribute-name.html.qk
                                         ^^^^^ string.quoted.single.qk constant.character.entity.qk
                                                 ^^^^^^ entity.other.attribute-name.html.qk
            `
        )
    })

    it("tokenizes control-flow directives and the from keyword", function () {
        checkTokens(
            tokenize,
            `
                <li #for={item from items}>{item}</li>
                    ^ punctuation.mark-directive.qk
                     ^^^ keyword.control.for.qk
                          ^^^^ meta.embedded.block.qk
                               ^^^^ keyword.control.qk
                                           ^ meta.template.expression.qk
                                            ^^^^ meta.embedded.block.qk
            `
        )
    })

    it("tokenizes dynamic, reference and event attributes", function () {
        checkTokens(
            tokenize,
            `
                <div !title={t} &checked={c}></div>
                     ^ punctuation.mark-dynamic.qk
                      ^^^^^ entity.other.attribute-name.dynamic.qk
                                ^ punctuation.mark-reference.qk
                                 ^^^^^^^ entity.other.attribute-name.reference.qk
                <button @click|prevent.stop={go}>go</button>
                        ^ punctuation.mark-event.qk
                         ^^^^^ entity.other.attribute-name.event.qk
                              ^ punctuation.definition.event-pipe.qk
                               ^^^^^^^^^^^^ constant.event-modifier.prevent.stop.qk
            `
        )
    })

    it("marks invalid value forms on attributes", function () {
        // 普通属性值必须加引号（unquoted → invalid）；特殊属性值必须包在
        // 花括号里（缺 { } → invalid）。修复前 "=" 子规则零宽度 end 立即闭合、
        // invalid 规则永不触发，unquoted 值退化为无 scope 的普通 token。
        checkTokens(
            tokenize,
            `
                <div width=100></div>
                           ^^^ invalid.illegal.unexpect-character.qk
                <div class={cls}></div>
                           ^^^^^ invalid.illegal.unexpect-character.qk
                <div #if=ok></div>
                         ^^ invalid.illegal.unexpect-character.qk
            `
        )
    })

    it("tokenizes interpolations with ts expressions", function () {
        checkTokens(
            tokenize,
            `
                <p>{a + b}</p>
                   ^ meta.template.expression.qk
                    ^ meta.embedded.block.qk source.ts
                      ^ keyword.operator.arithmetic.ts
                         ^ punctuation.section.embedded.end.qk
                <p>{"}"}</p>
                     ^ string.quoted.double.ts
                <p>{ {a: 1} }</p>
                     ^ punctuation.definition.block.ts
                <p>{}</p>
                   ^ meta.template.expression.qk
                    ^ punctuation.section.embedded.end.qk
            `
        )
    })

    it("threads interpolation state across lines", function () {
        checkTokens(
            tokenize,
            `
                <p>{fn(
                  arg
                  ^^^ meta.embedded.block.qk
                )}</p>
                 ^ punctuation.section.embedded.end.qk
            `
        )
    })

    it("tokenizes character entities and keeps unknown ones as text", function () {
        checkTokens(
            tokenize,
            `
                <p>&amp; &#65; &nope;</p>
                   ^^^^^ constant.character.entity.qk
                         ^^^^^ constant.character.entity.qk
                              ^^^^^^^ text
            `
        )
    })

    it("tokenizes comments and keeps tags inert inside them", function () {
        checkTokens(
            tokenize,
            `
                <!-- with <div>{x}</div> inside -->
                ^^^^ comment.block.qk
                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^ comment.block.qk
                                                ^^^ comment.block.qk
                <!-- never ends
                <div>
            `
        )

        // 未闭合注释吞掉后续所有行；单独断言（该行 token 是 [0,6) 的
        // 行尾伪影 token，气球精确边界断言会依赖这个实现细节）
        const doc = tokenize("<!-- never ends\n<div>\n")
        if (!doc[1].tokens.some(t => t.scopes.includes("comment.block.qk"))) {
            throw new Error("expected the unclosed comment to swallow the next line")
        }
    })

    it("keeps stray angle brackets in text as plain text", function () {
        checkTokens(
            tokenize,
            `
                <p>1 < 2 and 3 > 2</p>
                   ^^^^^^^^^^^^^^^ text
            `
        )
    })
})
