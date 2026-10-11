---
description: "Qingkuai async components: Promise and dynamic-import component tags, #await/#then/#catch directive rendering, dynamic switching, and instance access via &handle."
keywords: ["async component", "lazy load", "dynamic import", "#await", "#then", "code splitting", "异步组件", "懒加载"]
---

# Async Components

Async components load only when needed, reducing initial bundle size. A component tag can bind the result of a Promise that resolves to a component, or of a dynamic `import()`. Two rendering ways: direct rendering (tag bound to the Promise) and directive rendering (`#await`/`#then`/`#catch` for loading/failure states).

## Syntax

| Form | Syntax | Meaning |
|---|---|---|
| Direct: dynamic import | `const AsyncModule = import("./AsyncModule.qk")` then `<AsyncModule />` | Runtime extracts the component from the resolved module |
| Direct: custom Promise | `const AsyncPanel = new Promise(resolve => resolve(SyncPanel))` then `<AsyncPanel />` | Any Promise resolving to a component works |
| Direct: async return | `const CurrentView = getComponent()` where `getComponent` is async | Choose which component to load by condition |
| Directive: async processing | `<div #await={import("./Component.qk")}>Loading...</div>` + `<qk:spread #then={Module}><Module.default /></qk:spread>` + `<div #catch>...</div>` | Loading state, resolved rendering, failure fallback |
| Module vs component | `<Module.default />` or `<Module />` (module used directly) or `#then={{default: Component}}` destructuring | All supported |
| Dynamic switching | `let CurrentView = import("./AsyncOne.qk")`; assign a new import to switch | Reactive re-render on change |
| Instance access | `<AsyncView &handle={asyncView} />` | Same as normal components; exported members accessible |

## Rules

1. Use dynamic `import()` so build tools split the component into separate chunks.
2. With directive rendering, put placeholder content in the `#await` element and render through `qk:spread #then`; the `#catch` branch receives the rejection reason when given a binding (`#catch={err}`).
3. Assign async imports to `let`-declared variables to switch loaded components at runtime.
4. `&handle` on an async component tag yields the instance once loaded; read it in `onAfterMount` or later.

## Examples

Direct rendering with dynamic import:

```qk
<lang-js>
    import SyncPanel from "./SyncPanel.qk"

    // Manually construct a Promise that returns the imported component
    const AsyncPanel = new Promise(resolve => {
        setTimeout(() => {
            resolve(SyncPanel)
        }, 1000)
    })

    const AsyncModule = import("./AsyncModule.qk")
</lang-js>

<AsyncPanel />
<AsyncModule />
```

Directive rendering with loading and failure states:

```qk
<div #await={import("./Component.qk")}>
    Loading...
</div>
<qk:spread #then={Module}>
    <Module.default />
</qk:spread>
<div #catch>Fail to load Component.qk</div>
```

Async return chosen by condition:

```qk
<lang-js>
    import Comp1 from "./Comp1.qk"
    import Comp2 from "./Comp2.qk"

    async function getComponent() {
        return (await isOk()) ? Comp1 : Comp2
    }
</lang-js>

<div #await={getComponent()}>Loading...</div>
<qk:spread #then={Comp}>
    <Comp />
</qk:spread>
<div #catch={err}>Error: {err}</div>
```

Instance access through the settled component:

```qk
<lang-js>
    const AsyncView = import("./AsyncOne.qk")

    let asyncView

    onAfterMount(() => {
        console.log(asyncView) // logs: async component instance
    })
</lang-js>

<AsyncView &handle={asyncView} />
```

## See also

- [Dynamic Components](docs://agent/components/dynamic-components.md)
- [Compilation Directives](docs://agent/basic/compilation-directives.md)
- [Member Exports](docs://agent/components/exports.md)
