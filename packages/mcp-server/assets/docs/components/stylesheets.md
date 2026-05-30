---
description: ""
---

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

<div class="custom-block tip">
    Stylesheets imported via <a href="https://developer.mozilla.org/zh-CN/docs/Web/CSS/@import">@import</a> syntax in component style tags are also affected.
</div>

---

# Scoping Attribute Position

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
