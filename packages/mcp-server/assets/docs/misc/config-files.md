---
description: "Qingkuai configuration files - runtime configuration and formatting preferences."
---

# Configuration Files

## Runtime Configuration (.qingkuairc)

Runtime behavior configured through `.qingkuairc` file. Component files affected by configuration in current directory or nearest parent directory.

### Configuration Hierarchy

```
qingkuai-app/
├── src/
│   ├── Components/
│   │   ├── Hello.qk         (affected by: src/Components/.qingkuairc)
│   │   └── .qingkuairc
│   └── App.qk               (affected by: qingkuai-app/.qingkuairc)
└── .qingkuairc
```

---

### reactivityMode

**Type:** string  
**Default:** `"reactive"`  
**Allowed values:** `"reactive"` | `"shallow"`

**Behavior:**

- `"reactive"`: Deep reactivity; nested objects and arrays tracked automatically
- `"shallow"`: Shallow reactivity; only top-level value changes tracked

---

### whitespace

**Type:** string  
**Default:** `"trim-collapse"`  
**Allowed values:** `"preserve"` | `"trim"` | `"collapse"` | `"trim-collapse"`

**Behavior:**

- `"preserve"`: Keep all whitespace unchanged
- `"trim"`: Trim extra whitespace at element boundaries
- `"collapse"`: Collapse consecutive whitespace into single space
- `"trim-collapse"`: Apply both `trim` and `collapse` rules

---

### preserveHtmlComments

**Type:** string  
**Default:** `"development"`  
**Allowed values:** `"never"` | `"always"` | `"development"` | `"production"`

**Behavior:**

- `"never"`: HTML comment nodes not preserved
- `"always"`: HTML comment nodes preserved
- `"development"`: Preserved in development environment
- `"production"`: Preserved in production environment

---

### resolveImportExtension

**Type:** boolean  
**Default:** `true`

**Behavior:**

- `true`: `.qk` extension may be omitted in import statements
- `false`: `.qk` extension required

**Example (when true):**

```js
// Both resolve to ./Component.qk
import Component from "./Component"
import Component from "./Component.qk"
```

---

### shorthandDerivedDeclaration

**Type:** boolean  
**Default:** `true`

**Behavior:**

- `true`: Identifiers starting with `$` in top-level scope auto-compiled as derived reactive state
- `false`: Disables shorthand behavior

**Example (when true):**

```ts
const number = reactive(5)
const $double = number * 2 // Automatically: derived(() => number * 2)
```

**Reference:** [docs://basic/reactivity.md#derived-reactive-state](docs://basic/reactivity.md#derived-reactive-state)

---

### interpretiveComments

**Type:** boolean  
**Default:** `true`

**Behavior:**

- `true`: Interpretive comments inserted into compilation output
- `false`: Comments omitted from output

---

## Formatting Configuration

### Configuration File

Formatting implemented through [prettier-plugin-qingkuai](https://www.npmjs.com/package/prettier-plugin-qingkuai). Component file formatting follows standard [Prettier configuration](https://prettier.io/docs/options).

**Component-specific options:** Placed under `qingkuai` object in Prettier configuration file.

**Example:**

```json
{
    "tabWidth": 4,
    "printWidth": 80,
    "qingkuai": {
        "spaceAroundInterpolation": true
    }
}
```

---

### spaceAroundInterpolation

**Type:** boolean  
**Default:** `false`

**Behavior:**

- `true`: Spaces inserted at interpolation block beginning and end
- `false`: No spaces around interpolation

**Example (true):**

```qk
<div #for={ item, index of 3 }>{ index }: { item }</div>
```

**Example (false):**

```qk
<div #for={item, index of 3}>{index}: {item}</div>
```

---

### componentTagFormatPreference

**Type:** string  
**Default:** `"camel"`  
**Allowed values:** `"camel"` | `"kebab"`

**Behavior:**

- Affects component tag completion suggestions from Qingkuai language server
- `"camel"`: Suggestions in camelCase
- `"kebab"`: Suggestions in kebab-case

---

### componentAttributeFormatPreference

**Type:** string  
**Default:** `"camel"`  
**Allowed values:** `"camel"` | `"kebab"`

**Behavior:**

- Affects component attribute completion suggestions from Qingkuai language server
- `"camel"`: Suggestions in camelCase
- `"kebab"`: Suggestions in kebab-case
