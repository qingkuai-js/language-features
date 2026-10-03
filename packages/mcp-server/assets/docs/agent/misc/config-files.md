---
description: "Qingkuai configuration: .qingkuairc runtime configuration options (reactivityMode, whitespace, resolveImportExtension, ...) and Prettier qingkuai formatting options."
keywords: ["config", ".qingkuairc", "prettierrc", "reactivityMode", "whitespace", "format", "配置"]
---

# Configuration Files

The runtime configuration is modified per directory through the `.qingkuairc` file; component files are affected by the configuration file in the current directory or its nearest parent directory. Formatting follows standard Prettier configuration, with Qingkuai-specific options placed directly as top-level properties alongside standard Prettier options.

## Runtime configuration (.qingkuairc)

| Property | Type / values | Default | Meaning |
|---|---|---|---|
| `reactivityMode` | `"reactive"` \| `"shallow"` | `"reactive"` | Default inferred reactivity mode; `shallow` tracks changes to top-level values only, nested values are not tracked automatically |
| `whitespace` | `"preserve"` \| `"trim"` \| `"collapse"` \| `"trim-collapse"` | `"trim-collapse"` | Template whitespace handling |
| `preserveHtmlComments` | `"never"` \| `"always"` \| `"development"` \| `"production"` | `"development"` | Whether HTML comments are preserved |
| `requireReactivityMark` | boolean | `false` | when `true`, top-level variable declarations in script blocks must be explicitly marked with reactivity built-ins (`raw`/`reactive`/`shallow`/`derived`/`alias`) or compilation fails |
| `resolveImportExtension` | boolean | `true` | Allows omitting `.qk` in imports: `import Component from "./Component"` |
| `allowConstReactive` | boolean | `true` | when `false`, variables declared in constant declarations are not inferred as having reactivity, and explicitly marking a constant declaration with `reactive`/`shallow` raises compile error 1070 |
| `interpretiveComments` | boolean | `true` | Inserts interpretive comments into the compilation result |

## Formatting configuration (.prettierrc)

| Property | Type / values | Default | Meaning |
|---|---|---|---|
| `spaceAroundInterpolation` | boolean | `false` | `true` formats as `#for={ item, index of 3 }` |
| `selfCloseEmptySlotTags` | boolean | `true` | Empty `slot` tags format to `<slot />` |
| `componentTagFormatPreference` | `"camel"` \| `"kebab"` | `"camel"` | Component tag format + completion suggestions |
| `componentAttributeFormatPreference` | `"camel"` \| `"kebab"` | `"camel"` | Component attribute format + completion suggestions |

## Rules

1. Nearest `.qingkuairc` wins: a component picks up the config file in its own directory first, then walks up parents.
2. All runtime options have defaults; a project works out of the box with no config file.
3. Formatting is implemented by `prettier-plugin-qingkuai`; standard Prettier options (`tabWidth`, `printWidth`, ...) apply as usual.

## Examples

```json
{
    "reactivityMode": "shallow",
    "whitespace": "preserve"
}
```

```json
{
    "tabWidth": 4,
    "printWidth": 80,
    "spaceAroundInterpolation": true
}
```

## See also

- [Reactivity Inference Rules](docs://agent/references/reactivity-infer-rules.md)
- [Reactivity](docs://agent/basic/reactivity.md)
- [Language Features](docs://agent/misc/language-features.md)
