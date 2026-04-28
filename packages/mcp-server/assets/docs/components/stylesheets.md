---
description: "Style scoping mechanism for component encapsulation and conflict prevention."
---

# Scope

Automatic CSS scoping for component styles.

# Style Scoping Mechanism

All elements and styles in component receive scoping attribute:

```html
<!-- Template element gets scoping attribute -->
<div qk-dbb1016b>...</div>
```

```css
/* Original style -->
div { color: red; }

/* Becomes scoped -->
div[qk-dbb1016b] { color: red; }
```

Effect: Prevents style pollution between components and global styles.

# Imported Stylesheets

Stylesheets imported via `@import` in component styles are also scoped.

# Scoping Attribute Position

Default: Appended after last selector.

```css
/* Default scoping -->
div p[qk-dbb1016b] { }
.container .box[qk-dbb1016b] { }
```

## Custom Position

Use `qk-scope` selector to manually position scoping attribute:

```css
/* Original -->
div[qk-scope] p { }
[qk-scope] .container .box { }

/* Becomes -->
div[qk-dbb1016b] p { }
[qk-dbb1016b] .container .box { }
```

Constraint: Use `qk-scope` when default suffix injection breaks selector intent.
