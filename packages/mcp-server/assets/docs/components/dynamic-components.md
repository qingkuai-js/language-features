# Dynamic Components

Dynamic components let you switch between different components at runtime based on state, rather than fixing a component tag at compile time. In Qingkuai, when a component tag in the template is an identifier or member expression whose value changes at runtime, the compiler automatically compiles it as a dynamic component — when the expression value changes, rendering switches to the latest component automatically. Dynamic components can receive attributes, reference attributes, and slot content like regular components.

---

## Basic Syntax

Assign an imported component to a variable and use that variable as the tag name in the template. When the variable's value changes, rendering switches to the latest component automatically:

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

Dynamic components can receive attributes and reference attributes normally. When the component switches, the handle bound to a reference attribute is automatically updated to the latest component instance:

|js|ts|

```qk
<lang-js>
    import CounterView from "./views/CounterView"
    import BadgeView from "./views/BadgeView"

    import { nextTick } from "qingkuai"

    let CurrentView = CounterView

    setTimeout(async () => {
        CurrentView = BadgeView

        // Wait for the update scheduler to settle
        await nextTick()

        // BadgeView instance
        console.log(handle.value)
    }, 1000)
</lang-js>

<CurrentView &handle />
```

```qk
<lang-js>
    import CounterView from "./views/CounterView"
    import BadgeView from "./views/BadgeView"

    import { nextTick } from "qingkuai"

    let CurrentView: typeof CounterView | typeof BadgeView = CounterView

    setTimeout(async () => {
        CurrentView = BadgeView

        // Wait for the update scheduler to settle
        await nextTick()

        // BadgeView instance
        console.log(handle.value)
    }, 1000)
</lang-js>

<CurrentView &handle />
```

---

## Automatic Type Inference

When using `TypeScript`, you can use the `derived` built-in to let the compiler infer the union type of dynamic components automatically, avoiding manual type declarations. `derived` wraps a function that returns a component — the compiler infers the union type from the return value, and switching logic is tracked through reactive dependencies:

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
