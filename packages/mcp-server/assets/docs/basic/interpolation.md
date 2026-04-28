---
description: "Template interpolation: text, dynamic attributes, class binding, and valid expressions."
---

# Scope

Template interpolation syntax for embedding JavaScript/TypeScript expressions in templates.

# Text Interpolation

```qk
<lang-js>
    let variable = "Qingkuai"
</lang-js>
<p>Value: {variable}</p>  <!-- updates when variable changes -->
```

# Dynamic Attributes

Prefix attribute name with `!` and wrap value in curly braces:

```qk
<div !id={dynamicId}></div>
<img !src={imageUrl} />
```

Shorthand when attribute name matches identifier:

```qk
<div !id></div>    <!-- equivalent to: <div !id={id}></div> -->
```

## Class Binding

Object form (truthy keys applied):

```qk
<div !class={{
    active: isActive,
    "dark-mode": isDark
}}></div>
```

Array form (all items applied):

```qk
<div !class={[a, b, c]}></div>
```

Combining static and dynamic:

```qk
<div class="container" !class={getDynamicClasses()}></div>
```

Constraint: Cannot have multiple normal attributes with same name or multiple dynamic attributes with same name, except `class` which allows both.

Constraint: Shorthand syntax not supported if attribute name is keyword (e.g., `class`, `for`).

# Valid Interpolation Expressions

Only expressions allowed, not statements:

✓ Valid:

```js
{
    a * b - 5
}
{
    ;`Hello ${str}`
}
{
    class MyClass {}
}
{
    new Date()
}
{
    ;() => {}
}
{
    function anonymous() {}
}
{
    condition ? value1 : value2
}
{
    str.split("").reverse().join("")
}
```

✗ Invalid:

```js
{id;}          // statement
{try{}}        // statement
{return 10}    // statement
{const x = 10} // statement
{if(...){}}    // statement
{import ...}   // statement
```

# Template Syntax Rules

- Attribute values must be wrapped in quotes or curly braces (compiler error otherwise)
- Attributes prefixed with `!`, `@`, `#`, `&` are special and processed by compiler
- Uppercase tag names or tags with `-` or `.` are component tags (except embedded language tags)
