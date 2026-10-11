---
description: "Qingkuai reactivity APIs and declaration forms: compiler-inferred reactivity, explicit raw/reactive/shallow markers, derived state (derived / derivedExp), alias bindings, reactivity modes, non-reactive reads (noTracking / raw), and toRaw/toReactive/createStore utilities."
keywords: ["reactivity", "reactive", "shallow", "raw", "derived", "derivedExp", "noTracking", "响应性", "衍生", "非响应式读取"]
---

# Reactivity

## Syntax

`raw`, `reactive`, `shallow`, `derived`, `derivedExp`, and `alias` are built-in methods; the conversion and store utilities are imported from `qingkuai`.

| API | Call form | Effect |
| --- | --- | --- |
| `raw` | `raw(value)` in a variable initializer | Explicit marker: identifier is static; reactive capability is not added |
| `reactive` | `reactive(value)` in a variable initializer | Explicit marker: identifier is deeply reactive |
| `shallow` | `shallow(value)` in a variable initializer | Explicit marker: identifier is shallow reactive; only the identifier itself is reactive, complex-type properties are not made reactive |
| `derived` | `derived(() => expr)` | Declares derived reactive state from a function |
| `derivedExp` | `derivedExp(expr)` | Declares derived reactive state from an expression passed directly |
| `alias` | `alias(target)` | Alias binding: reads and writes of the alias identifier are rewritten into reads and writes of the original target, providing reactive access |
| `toRaw` | `import { toRaw } from "qingkuai"` then `toRaw(value)` | Returns the raw value behind a reactive proxy object |
| `toReactive` | `import { toReactive } from "qingkuai"` then `toReactive(value)` | Returns the value's reactive proxy object |
| `toShallow` | `import { toShallow } from "qingkuai"` then `toShallow(value)` | Returns the value's shallow reactive proxy object |
| `noTracking` | `import { noTracking } from "qingkuai"` then `noTracking(fn)` | Non-reactive read: pauses dependency tracking while the passed function executes |
| `createStore` | `import { createStore } from "qingkuai"` then `createStore({ ... })` | Creates a reactive state store, usable outside components and shareable among components |

Per-component reactivity mode override: a `reactive` or `shallow` attribute on the embedded script tag — `<lang-js reactive>` (deep) or `<lang-js shallow>`.

## Rules

1. No manual declaration is needed: the compiler attaches reactive capability to identifiers according to the reactivity inference rules; when reactive data changes, the interface updates automatically without manual DOM operations.
2. Explicit markers (`raw`, `reactive`, `shallow` in the variable initializer) take priority over implicit inference. Identifiers not accessed in the template are otherwise inferred as raw; mark them with `reactive` or `shallow` if they must keep reactive capability.
3. Default reactivity mode is deep reactivity: properties of complex types are made reactive recursively. With shallow reactivity, only the identifier itself is reactive. Mode is set globally via a `.qingkuairc` file with `"reactivityMode": "shallow"` (effective for the directory and all subdirectories until another configuration file), and overridden per component with the script-tag attribute.
4. Derived reactive state re-runs the next time it is read after its reactive dependencies change; prefer it over complex expressions inside template interpolation blocks. Declare it with `derived(() => ...)` or `derivedExp(expr)`.
5. `alias` simplifies reactive access to deeply nested properties (best used with component props and refs): the compiler rewrites reads and writes of the alias identifier into reads and writes of the original target.
6. Normal JavaScript destructuring of a reactive object keeps reactive capability on the destructured variables; the compiler adds it automatically. `alias` also supports destructuring.
7. `createStore` declares reactive state outside components; importing the store in multiple components shares the same reactive state.
8. Non-reactive reads: reading a reactive value in a template interpolation block or in watchers and side effects establishes a dependency by default; to read only the current value, perform a non-reactive read with the runtime API `noTracking` (pauses dependency tracking while the passed function executes) or the built-in method `raw`. `noTracking` only pauses dependency tracking and does not change the type of the evaluation result; accessing properties of its return value may still establish dependencies. Combine it with `toRaw` when the raw value is needed. A non-reactive read is not "frozen": when other tracked dependencies in the same expression change and trigger a re-evaluation, the non-reactive parts are re-executed as well and get the latest values.
9. At the rendering level: a `raw` read creates no render side effect and is evaluated only once on the initial render; later dependency changes do not trigger an update, but when the conditional rendering or list rendering it lives in re-renders, the non-reactive reads inside are re-evaluated with the current values.

## Constraints

- Degeneration: a `const` declaration whose initial value is a literal type (such as a numeric or string literal) degenerates into a raw value and any explicit marker is ignored (`const a = shallow(1)` is a raw value). A non-literal initializer such as `const c = reactive({})` is inferred normally. See [Reactivity Inference Rules](docs://agent/references/reactivity-infer-rules.md).
- `raw()` opts an identifier out of reactivity: changing it does not update the page. It only explicitly marks that the identifier itself is not reactive; if the initial value itself is reactive, its reactivity capability is not removed — use `toRaw` to obtain the raw value in order to remove the reactivity of the initial value.
- `toReactive` does not add new reactive capability to the passed value; it only returns that value's reactive proxy object. If the value was not inferred or explicitly marked as reactive by the compiler, the returned proxy is not reactive either.
- Do not overuse `alias` with non-reactive values; it is designed primarily to simplify reactive access to deeply nested properties.
- Avoid relying on reactivity for script-only logic; organize script logic with function composition instead. Operating on reactive data incurs overhead, and overuse makes change flows unintuitive.

## Examples

Compiler-inferred reactivity — the template updates automatically:

```qk
<lang-js>
    let progress = "pending"

    setTimeout(() => {
        progress = "completed"
    }, 1000)
</lang-js>

<h1>Task status: {progress}</h1>
```

`raw()` opts out — `progress` changes but the page does not update:

```qk
<lang-js>
    let progress = raw("pending")

    setTimeout(() => {
        progress = "completed"
    }, 1000)
</lang-js>

<h1>Task status: {progress}</h1>
```

Derived reactive state in two forms:

```qk
<lang-js>
    let number = 10

    const double = derived(() => number * 2)
    const doubleExp = derivedExp(number * 2)
</lang-js>

<p>{double} {doubleExp}</p>
```

Non-reactive read — changes of `message` do not trigger `summary` to be re-evaluated:

```js
import { noTracking } from "qingkuai"

let count = reactive(0)
let message = reactive("hello")

// updates of message do not trigger summary to be re-evaluated
const summary = derived(() => {
    return count + noTracking(() => message)
})
```

Alias binding to a deeply nested target:

```qk
<lang-js>
    let name = alias(refs.userInfo.detail.information.name)

    setTimeout(() => {
        name = "Unknown"
    }, 1000)
</lang-js>

<p>User name is: {name}</p>
```

## See also

- [Reactivity Inference Rules](docs://agent/references/reactivity-infer-rules.md)
- [Compilation Directives](docs://agent/basic/compilation-directives.md)
- [Runtime API](docs://agent/references/api.md)
