---
description: "Qingkuai component files: file-based definition model, import and tag usage, kebab-case/camelCase naming equivalence, and member access tags."
keywords: ["component", "component file", ".qk", "import", "tag", "kebab-case", "组件"]
---

# Component Basics

Components are the basic units for building Qingkuai UIs. Each `.qk` file defines one component; after compilation it becomes a JavaScript module with a default export.

## Syntax

| Form | Syntax | Meaning |
|---|---|---|
| Import a component | `import Component from "./Component.qk"` | Inside the embedded script block |
| Use a component | `<Component />` | Tag name matches the import identifier; usable multiple times |
| Kebab-case tag | `<my-component />` | Equivalent to `<MyComponent />` |
| Member access tag | `<Module.default />` | Common with async components |

## Rules

1. One component per `.qk` file; import it and reuse it in the template section by adding a tag with the same name as the import identifier.
2. Component tag names starting with an uppercase letter or containing `-` or `.` are treated as component tags.
3. By default, formatting transforms component names to camelCase; a `.prettierrc` containing `{"qingkuai": {"componentTagFormatPreference": "kebab"}}` switches to kebab-case, and the language server then prioritizes kebab-case tags in completion.
4. Component tags support member access syntax (`<Module.default />`), commonly seen with async components.

## Examples

```qk
<lang-js>
    import Component from "./Component.qk"
</lang-js>

<Component />
<Component />
```

## See also

- [Component Attributes](docs://agent/components/attributes.md)
- [Member Exports](docs://agent/components/exports.md)
- [Async Components](docs://agent/components/async-components.md)
