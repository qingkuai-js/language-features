---
description: "Qingkuai stylesheets: scoped embedded style blocks, #scope style penetration, src/@import external styles, global style blocks, and qk-scope selector positioning."
keywords: ["style", "stylesheet", "scoped styles", "lang-css", "global", "#scope", "qk-scope", "样式"]
---

# Component Stylesheets

Embedded style blocks (e.g. `<lang-css>`) in component files are scoped: rendered template elements receive a scoping attribute (e.g. `qk-dbb1016b`), and style rules get it appended to their selectors, preventing global pollution.

## Syntax

| Form | Syntax | Meaning |
|---|---|---|
| Scoped style block | `<lang-css> div { color: red; } </lang-css>` | Compiles to `div[qk-xxxx] { ... }` |
| Global style block | `<lang-css global> ... </lang-css>` | Rules receive no scoping attribute |
| External stylesheet | `<lang-scss src="./styles/theme.scss" />` | `src` attribute; the tag must have no content |
| Import inside styles | an `@import` statement in the block body, e.g. `@import "./styles/base.css";` | Style rules stay inside the block body |
| Global + external | `<lang-css global src="./index.css" />` | Combines both |
| Scope position control | `div[qk-scope] p { }` | `qk-scope` attribute selector marks where the scoping attribute lands: `div[qk-xxxx] p { }` |
| Style penetration | `#scope` directive on a component tag | Passes the parent's scope attribute to the child's root element (see Compilation Directives) |

## Rules

1. All template content receives a scoping attribute during rendering; embedded style rules are scoped with the same attribute automatically.
2. Default position of the scoping attribute is after the last selector (`div p[qk-xxxx]`, `.container .box[qk-xxxx]`); move it with the `qk-scope` attribute selector.
3. Embedded style blocks may use any style language tag supported by the toolchain (`lang-css`, `lang-scss`, ...).
4. `#scope` on a component tag lets parent styles affect the child's root element; it is composable along the ancestor chain.

## Constraints

- A style tag using the `src` attribute cannot contain tag content.
- Avoid having the same shared stylesheet repeatedly imported through `src`/`@import` by component scoped styles — the compilation result may generate multiple copies of equivalent rules with different scope identifiers attached; see the optimization doc for how to reuse shared styles.

## Examples

Scoped embedded styles:

```qk
<lang-css>
    div {
        color: red;
    }
</lang-css>

<div>Scoped red text</div>
```

Global style block:

```qk
<lang-css global>
    .page-title {
        color: #111;
    }
</lang-css>

<h1 class="page-title">Page Title</h1>
```

External sources (shown as written; not compiled here):

```text
<lang-scss src="./styles/theme.scss" />
<lang-css global src="./index.css" />

<lang-css>
    @import "./styles/base.css";
    .local-rule { color: #333; }
</lang-css>
```

Scoping-attribute position control (CSS view):

```css
/* written */
div[qk-scope] p {
}
[qk-scope] .container .box {
}

/* compiled */
div[qk-dbb1016b] p {
}
[qk-dbb1016b] .container .box {
}
```

## See also

- [Compilation Directives](docs://agent/basic/compilation-directives.md)
- [Optimization](docs://agent/misc/optimization.md)
