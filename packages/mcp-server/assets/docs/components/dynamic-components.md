# Dynamic Components

Dynamic components let you switch between different components at runtime based on state, rather than fixing a component tag at compile time. In Qingkuai, as long as the component tag in the template is an identifier or member expression whose value changes at runtime, the compiler automatically compiles it as a dynamic component — when the expression's value changes, rendering automatically switches to the latest component. Dynamic components can receive attributes, reference attributes, and slot content like regular components.

---

## Basic Syntax

Assign an imported component to a variable and use that variable directly as the tag name in the template. When the variable's value changes, rendering switches to the latest component automatically:

|js|ts|

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

```qk
<lang-ts>
    import CounterView from "./views/CounterView"
    import BadgeView from "./views/BadgeView"

    let CurrentView: typeof CounterView | typeof BadgeView = CounterView

    setTimeout(() => {
        CurrentView = BadgeView
    }, 1000)
</lang-ts>

<CurrentView />
```

---

## Instance Access

Dynamic components can receive attributes and reference attributes normally. When the component switches, the handle bound to a reference attribute is automatically updated to the handle of the latest component instance:

|js|ts|

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

```qk
<lang-ts>
    import type { ComponentInstance } from "qingkuai"

    import CounterView from "./views/CounterView"
    import BadgeView from "./views/BadgeView"
    import { nextTick } from "qingkuai"

    type DynamicView = typeof CounterView | typeof BadgeView

    let CurrentView: DynamicView = CounterView
    let handle: ComponentInstance<DynamicView> | null = null

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
</lang-ts>

<CurrentView &handle />
```

---

## Automatic Type Inference

When combined with `TypeScript`, you can use the `derived` built-in method to let the compiler infer the union type of dynamic components automatically, avoiding manual type declarations. `derived` wraps a function that returns a component — the compiler infers the union type from that function's return value, and switching logic is also tracked by reactive dependencies:

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
