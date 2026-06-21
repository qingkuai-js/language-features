# Stylesheets

Stylesheets serve not only to beautify pages but also as vital complements to component functionality. A well-designed styling system enhances both user experience and component expressiveness/reusability. In component-based development, traditional global styles often cause conflicts and maintenance difficulties, while scoping mechanisms effectively solve these issues. By confining styles within components, developers can safely define class names and style rules without affecting other components or page elements. This approach preserves CSS flexibility while delivering stronger controllability and maintainability - essential for building modern frontend applications.

---

## Style Scoping

All content in component templates receives a scoping attribute during rendering, for example:

```html
<div>...</div>
```

Renders as HTML similar to:

```html
<div qk-dbb1016b>...</div>
```

To prevent component styles from polluting global or other component styles, embedded styles also receive scoping attributes, for example:

```qk
<lang-css>
    div {
        color: red;
    }
</lang-css>
```

Gets converted to:

```css
div[qk-dbb1016b] {
    color: red;
}
```

---

## Style Penetration

Scoped styles ensure component isolation, but there are cases where you may want a parent component's style rules to affect a child component's root element. Qingkuai provides the `#scope` directive for this — see <a href="docs://basic/compilation-directives.md#scope-directive">Compilation Directives / Scope Directive</a> for details.

---

## External Style Sources

Embedded style blocks support two ways to bring in external style files: a static `src` attribute on the tag, or an `@import` statement inside the style content:

```qk
<lang-scss src="./styles/theme.scss" />
```

<div class="custom-block warning">
    When using the <code>src</code> attribute, the embedded style tag cannot contain tag content.
</div>

When using `@import`, style rules are written inside the embedded style tag body:

```qk
<lang-css>
    @import "./styles/base.css";

    .local-rule {
        /* ... */
    }
</lang-css>
```

<div class="custom-block warning">
    If the same shared stylesheet is imported repeatedly by multiple scoped component styles through <code>src</code> or <code>@import</code>, compilation may produce multiple copies of equivalent rules (with different scope markers). Try to avoid this pattern: <a href="docs://misc/optimization.md#style-reuse">Optimization - Style Reuse</a>.
</div>

---

## Global Styles

By default, embedded styles are scoped with component scope attributes. If you want a style block to be treated as global, add the boolean `global` attribute to the embedded style tag — for example, `.page-title` below will not receive component scope attributes:

```qk
<lang-css global>
    .page-title {
        color: #111;
    }
</lang-css>
```

You can also combine `global` with `src`:

```qk
<lang-css global src="./index.css" />
```

---

## Scoping Attribute Position

Normally the scoping attribute gets appended after the last selector:

```css
div p[qk-dbb1016b] {
}
.container .box[qk-dbb1016b] {
}
```

But we can manually adjust its position using the `qk-scope` attribute selector, for example:

```css
div[qk-scope] p {
}
[qk-scope] .container .box {
}
```

Gets converted to:

```css
div[qk-dbb1016b] p {
}
[qk-dbb1016b] .container .box {
}
```
