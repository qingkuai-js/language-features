---
description: "Component definition, usage, file-based model, and naming conventions."
---

# Scope

Component definition and usage in Qingkuai.

# Component Definition

Each component is a `.qk` file that compiles to a JavaScript module with default export:

```qk
<!-- Component.qk -->
<lang-js>
    let count = 0
</lang-js>

<p>Count: {count}</p>
<button @click={count++}>Increment</button>
```

# Component Usage

```qk
<!-- Parent.qk -->
<lang-js>
    import Component from "./path/to/Component.qk"
</lang-js>

<Component />
<Component />
```

# Component Naming

Both kebab-case and camelCase supported:

```qk
<MyComponent />
<my-component />
```

## Formatting Preferences

Add `.prettierrc` in component directory or parent:

```json
{
    "qingkuai": {
        "componentTagFormatPreference": "kebab"
    }
}
```

Default: camelCase formatting.

Effects: Formatter behavior and language server completion suggestions.
