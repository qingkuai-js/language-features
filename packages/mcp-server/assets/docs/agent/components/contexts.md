---
description: "Qingkuai component contexts: setContext/setContextGetter/setContextExp writes, prototype-chain reads via contexts, default values, and external instance-bound context APIs."
keywords: ["context", "contexts", "setContext", "provide", "inject", "上下文", "跨组件"]
---

# Component Contexts

Contexts provide a top-down communication channel along the component tree: a component writes data into its own contexts layer, and all descendants read it directly — no attribute forwarding through intermediate layers, and no need to know which ancestor the data came from. Unlike the reactive state store, which also shares data across components but requires consumers to explicitly import the state module, with the data flow scattered across those import sites, contexts are an implicit injection suited for theme, locale, and current-user style data provided uniformly by the application layer and consumed by a wide range of descendants.

## Syntax

| Form | Syntax | Meaning |
|---|---|---|
| Write context | `setContext("theme", "dark")` | Built-in method; writes into the current component's contexts layer |
| Read context | `contexts.theme` | Built-in `contexts` identifier; usable in script and template |
| Reactive write (manual getter) | `setContext("getCount", () => count)` | Descendants call it: `contexts.getCount()` |
| Reactive write (auto getter) | `setContextGetter("count", () => count)` | Descendants read without calling: `contexts.count` |
| Reactive write (shorthand) | `setContextExp("count", count)` | Compiler wraps the expression as a getter → `setContextGetter` |
| Default value | `defaults({ contexts: { theme: "light" } })` | Fallback when the key is absent along the chain; keys narrow to non-optional afterward |
| External write | `setContext(instance, "key", value)` | Runtime-package form; instance as FIRST argument |
| External read | `getContexts(instance).theme` | Returns the contexts chain-head object of the target instance |

Type the context contract with a `Meta` typedef (`@property {string} [contexts.theme]`) or `interface Meta { contexts: {...} }` for property completion.

## Rules

1. Every component has its own contexts layer whose prototype points to the parent's layer; reads walk the prototype chain and return the nearest value.
2. A key written in the component's own layer shadows the inherited key without affecting the parent's value — the same contract can present different values in different subtrees.
3. `setContext` captures the value at write time; later changes to the source are NOT synchronized into the context. For reactive contexts use `setContextGetter`/`setContextExp`.
4. External modules operate on contexts two ways: pass the built-in methods as arguments (already instance-bound), or import `setContext`/`setContextGetter`/`getContexts` from the `qingkuai` runtime package and pass the target instance (built-in `instance` identifier, or a child instance obtained via `&handle`) as the first argument.

## Examples

Write in the ancestor, read in the descendant:

```qk
<!-- Outer.qk -->
<lang-js>
    import { Inner } from "./Inner.qk"

    /**
     * @typedef {Object} Meta
     * @property {Object} contexts
     * @property {string} [contexts.theme]
     */
    setContext("theme", "dark")
</lang-js>

<Inner />
```

```qk
<!-- Inner.qk -->
<lang-js>
    console.log(contexts.theme) // logs: dark
</lang-js>

<button !class={contexts.theme}>Theme Button</button>
```

Nearest-value shadowing along the chain:

```qk
<!-- Middle.qk -->
<lang-js>
    // Resolved along the prototype chain to the value written by Outer
    console.log(contexts.theme) // logs: dark

    // Writing the same key shadows Outer's value
    setContext("theme", "light")
</lang-js>

<Inner />
```

Reactive context with `setContextExp` (plain js):

```js
let count = reactive(0)
setContextExp("count", count)

// Descendant components read without manually calling a getter
// contexts.count
```

External read of a child's context (plain js):

```js
// theme.js
import { getContexts } from "qingkuai"

export function getThemeContext(instance) {
    return getContexts(instance).theme
}
```

```qk
<lang-js>
    import { getThemeContext } from "./theme"

    let child = null

    // Get the current component's theme context value
    getThemeContext(instance)

    // Get the child component's theme context value
    getThemeContext(child)
</lang-js>

<Child &handle={child} />
```

## Constraints

- Do not use contexts for data a single parent-child edge needs — that is what component attributes are for.
- Plain `setContext` values are snapshots, not live bindings; re-check you picked the getter variant when descendants must observe changes.
- `getContexts` targets an instance; it never walks or mutates a global store.

## See also

- [Component Attributes](docs://agent/components/attributes.md)
- [Reactivity](docs://agent/basic/reactivity.md)
- [Runtime Package API](docs://agent/references/api.md)
