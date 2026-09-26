# Stylesheets

Stylesheets serve not only to beautify pages but also as vital complements to component functionality. A well-designed styling system not only enhances user experience but also strengthens component expressiveness and reusability. In component-based development, traditional global styles tend to cause conflicts and increase maintenance costs, while the scoping mechanism can effectively alleviate these issues. By confining styles within components, developers can define class names and rules with greater confidence, without worrying about affecting other components or page elements. This approach preserves the flexibility of CSS while delivering stronger controllability and maintainability.

---

## Style Scoping

All content in component templates receives a scoping attribute during rendering, for example:

```html
<div>...</div>
```

Is rendered as an HTML fragment similar to:

```html
<div qk-dbb1016b>...</div>
```

To prevent component styles from polluting global styles or other components, embedded styles are likewise given scoping attributes, for example:

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

## External Style Sources

Embedded style blocks support two ways to bring in external style files: via a static `src` attribute on the tag, or via an `@import` statement in the style content:

```qk
<lang-scss src="./styles/theme.scss" />
```

> [!WARNING]
> When using the `src` attribute, the embedded style tag cannot contain tag content.

When using `@import`, style rules are written in the content body of the embedded style tag:

```qk
<lang-css>
    @import "./styles/base.css";

    .local-rule {
        /* ... */
    }
</lang-css>
```

> [!WARNING]
> When the same shared stylesheet is repeatedly imported by component scoped styles through `src` or `@import`, the compilation result may generate multiple copies of equivalent rules (with different scope identifiers attached). Try to avoid this pattern: [Optimization - Style Reuse](docs://misc/optimization.md#style-reuse).

---

## Global Styles

By default, embedded styles automatically receive component scope attributes. If you want the current style block to be treated as global styles, add the boolean attribute `global` to the embedded style tag — for example, `.page-title` below will not be attached component scope attributes:

```qk
<lang-css global>
    .page-title {
        color: #111;
    }
</lang-css>
```

In addition, `global` can also be combined with `src`:

```qk
<lang-css global src="./index.css" />
```

---

## Scoping Attribute Position

Normally, the scoping attribute is appended after the last selector:

```css
div p[qk-dbb1016b] {
}
.container .box[qk-dbb1016b] {
}
```

But we can manually adjust the position where the scoping attribute is added using the `qk-scope` attribute selector, for example:

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

---

## Style Penetration

Scoped styles guarantee the independence of components, but in some scenarios you may want the style rules of a parent component to be able to affect the root element of a child component. Qingkuai provides the [#scope directive](docs://basic/compilation-directives.md#scope-directive) to fulfill this need.
