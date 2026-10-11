---
description: "Qingkuai component lifecycle: onAfterMount, onBeforeDestroy, onAfterDestroy, onBeforeUpdate, onAfterUpdate — built-in registration rules and external instance-bound registration."
keywords: ["lifecycle", "onAfterMount", "onBeforeDestroy", "onBeforeUpdate", "onAfterUpdate", "生命周期"]
---

# Component Lifecycle

Lifecycle methods insert logic at component phases: mounting (`onAfterMount`), unmounting (`onBeforeDestroy`, `onAfterDestroy`), updating (`onBeforeUpdate` before each update is scheduled, `onAfterUpdate` after update scheduling completes).

## Syntax

| Hook | Fires |
|---|---|
| `onAfterMount(cb)` | After the component is mounted |
| `onBeforeUpdate(cb)` | Before each update is scheduled (recurs on every update) |
| `onAfterUpdate(cb)` | After update scheduling completes (recurs on every update) |
| `onBeforeDestroy(cb)` | Before the component is unmounted |
| `onAfterDestroy(cb)` | After the component is unmounted |

There is NO `onBeforeMount`: the entire embedded script block runs before the component is mounted, so pre-mount logic goes there directly.

## Rules

1. All lifecycle methods are built-in methods of component files — call them directly without import; the compiler binds them to the current component instance.
2. Callbacks registered in async logic (e.g. inside `setTimeout`) are still bound to the correct component instance.
3. If the phase has already passed when a callback registers, it never fires and a warning is emitted in development mode — e.g. `onAfterMount` inside `setTimeout` never triggers. Exception: `onBeforeUpdate`/`onAfterUpdate` windows recur on every update, so late registrations fire on the next update.
4. External registration imports the method from the `qingkuai` runtime package with the target component instance as the FIRST argument, then the callback. Alternatively pass the built-in lifecycle methods themselves to the external module (same pattern as watchers and contexts).

## Examples

Built-in registration:

```js
onAfterMount(() => {
    console.log("component mounted")
})
```

External module with instance binding:

```js
// util.js
import { onBeforeUpdate } from "qingkuai"

export function useBeforeUpdateMiddleware(instance) {
    onBeforeUpdate(instance, () => {
        console.log("before update")
    })
}
```

```qk
<lang-js>
    import { useBeforeUpdateMiddleware } from "./util"

    useBeforeUpdateMiddleware(instance)
</lang-js>
```

## See also

- [Watchers and Side Effects](docs://agent/basic/watchers-and-side-effects.md)
- [Component Contexts](docs://agent/components/contexts.md)
- [Built-in Identifiers](docs://agent/references/intrinsics.md)
