---
description: "Qingkuai interpolation blocks: text interpolation, dynamic attributes, dynamic class object/array forms, and the expression-only rule inside curly braces."
keywords: ["interpolation", "dynamic attribute", "class binding", "expression", "插值", "动态属性", "模板"]
---

# Interpolation Blocks

Qingkuai template syntax is almost HTML with subtle differences: attribute values must be quoted or braced; attribute names starting with `!`, `@`, `#`, or `&` are compiler-processed; tag names starting with an uppercase letter or containing `-` or `.` are component tags (except embedded language tags); curly braces in text or attribute values open an interpolation block.

## Syntax

| Form | Syntax | Meaning |
|---|---|---|
| Text interpolation | `<p>{variable}</p>` | Renders the expression result as text; auto-updates when it changes |
| Dynamic attribute | `<div !id={dynamicId}></div>` | `!` prefix; value wrapped in braces |
| Dynamic attribute shorthand | `<div !id></div>` | Equivalent to `!id={id}` when the identifier matches the attribute name; NOT supported when the name is a language keyword/reserved word (e.g. `class`, `for`) |
| Dynamic class (object) | `!class={{ active, "dark-mode": isDarkMode }}` | Keys with truthy values are applied to the class list |
| Dynamic class (array) | `!class={[a, b, c]}` | Every item is applied to the class list |
| Static + dynamic class | `class="container" !class={list}` | Only `class` may appear twice on one tag; the compiler merges both class lists |

## Rules

1. Curly braces accept expressions only — anything usable on the right-hand side of an assignment. Valid: `{a * b - 5}`, ``{`Hello ${str}`}``, `{new Date()}`, `{() => {}}`, `{condition ? a : b}`, `{str.split("").reverse().join("")}`, even class/function expressions `{class MyClass{}}`.
2. Statements are never allowed and raise a fatal compiler error: `{id;}`, `{return 10}`, `{const n = 10}`, `{if(cond){}}`, `{switch(v){}}`, `{for(const u of users){}}`, `{import {raw} from "qingkuai"}`.
3. The same tag cannot declare two attributes with the same name, even if one is normal and one dynamic — `class` is the only exception (one normal + one dynamic allowed, merged by the compiler).

## Constraints

- Attribute values without quotes or braces are a fatal compiler error.
- The shorthand `!id` (= `!id={id}`) is unavailable when the attribute name is a keyword or reserved word of the embedded script language.

## Examples

Text interpolation with a reactive value:

```qk
<lang-js>
    let variable = "Qingkuai"
</lang-js>

<p>value of variable is: {variable}</p>
```

Dynamic attributes, including object/array class forms:

```qk
<lang-js>
    let dynamicId = "top-box"
    let active = true
    let isDarkMode = false
    let extra = "highlight"
</lang-js>

<div !id={dynamicId}></div>
<div
    !class={
        {
            active,
            "dark-mode": isDarkMode
        }
    }
></div>
<div class="container" !class={[extra]}></div>
```

Shorthand equivalence:

```qk
<lang-js>
    let title = "hello"
</lang-js>

<div !title></div>
<div !title={title}></div>
```

Statements must not appear inside interpolation blocks; the following are all fatal errors:

```text
{id;}
{return 10}
{const number = 10}
{if(condition){}}
{for(const user of users){}}
```

## See also

- [Compilation Directives](docs://agent/basic/compilation-directives.md)
- [Reference Attributes](docs://agent/basic/reference-attributes.md)
- [Event Handling](docs://agent/basic/event-handling.md)
