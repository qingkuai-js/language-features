---
description: "Qingkuai dynamic components: variable component tags, automatic switching on value change, instance handle updates, and derived-based union type inference."
keywords: ["dynamic component", "component switch", "derived", "动态组件"]
---

# Dynamic Components

When a component tag in the template is an identifier (or member expression) whose value changes at runtime, the compiler compiles it as a dynamic component: when the value changes, rendering switches to the latest component automatically. Dynamic components receive attributes, reference attributes, and slot content like regular components.

## Syntax

| Form | Syntax | Meaning |
|---|---|---|
| Variable tag | `<CurrentView />` | `CurrentView` is a variable holding a component; switching the value switches rendering |
| Instance handle | `<CurrentView &handle />` | Handle auto-updates to the latest component instance after each switch |
| Derived switch (TS) | `const CurrentView = derived(() => condition ? A : B)` | Compiler infers the union type; switching tracked through reactive dependencies |

## Rules

1. Assign an imported component to a variable and use the variable as the tag name; changing the variable switches the rendered component.
2. A reference attribute handle on a dynamic component updates automatically when the component switches; read the new instance after `await nextTick()`.
3. With TypeScript, prefer `derived` over manual union type declarations — the compiler infers the union type from the function's return value.

## Examples

Basic switching:

```qk
<lang-js>
    import CounterView from "./views/CounterView"
    import BadgeView from "./views/BadgeView"

    let CurrentView = CounterView

    setTimeout(() => {
        CurrentView = BadgeView
    }, 1000)
</lang-js>

<CurrentView />
```

Instance access across switches:

```qk
<lang-js>
    import CounterView from "./views/CounterView"
    import BadgeView from "./views/BadgeView"
    import { nextTick } from "qingkuai"

    let handle = null
    let CurrentView = CounterView

    setTimeout(async () => {
        CurrentView = BadgeView

        // Wait for the update scheduling to complete
        await nextTick()

        // BadgeView instance
        console.log(handle)
    }, 1000)

    onAfterMount(() => {
        console.log(handle) // logs: CounterView instance
    })
</lang-js>

<CurrentView &handle />
```

TypeScript union inference with `derived`:

```qk
<lang-ts>
    import CounterView from "./views/CounterView"
    import BadgeView from "./views/BadgeView"

    let condition = reactive(true)

    const CurrentView = derived(() => {
        return condition ? CounterView : BadgeView
    })
</lang-ts>

<CurrentView />
```

## See also

- [Async Components](docs://agent/components/async-components.md)
- [Reactivity](docs://agent/basic/reactivity.md)
- [Component Basics](docs://agent/components/basic.md)
