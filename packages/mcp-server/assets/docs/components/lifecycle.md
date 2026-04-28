---
description: "Component lifecycle phases and hook functions for different stages."
---

# Scope

Lifecycle hook functions for controlling component behavior at different phases.

# Lifecycle Phases

| Phase      | Hooks                               | Description                        |
| ---------- | ----------------------------------- | ---------------------------------- |
| Mounting   | `onAfterMount`                      | After component mounts             |
| Unmounting | `onBeforeDestroy`, `onAfterDestroy` | Before/after component unmounts    |
| Updating   | `onBeforeUpdate`, `onAfterUpdate`   | Before/after each update scheduled |

Constraint: No `onBeforeMount` hook is provided; embedded script executes before mount.

# Registering Callbacks

```js
import { onAfterMount } from "qingkuai"

onAfterMount(() => {
    console.log("component mounted")
})
```

# Available Hooks

```js
import {
    onAfterMount,
    onBeforeDestroy,
    onAfterDestroy,
    onBeforeUpdate,
    onAfterUpdate
} from "qingkuai"
```

# Constraints

- Lifecycle callbacks must be registered in synchronous scope
- Cannot register in async logic (compiler records current mounting instance synchronously)

✗ Invalid:

```js
setTimeout(() => {
    onBeforeDestroy(() => {})
}) // Error: no mounting context
```

✓ Valid - External encapsulation:

```js
// util.js
import { onBeforeUpdate } from "qingkuai"

export function useBeforeUpdateMiddleware() {
    onBeforeUpdate(() => {
        console.log("before update")
    })
}

// Component.qk
;<lang-js>
    import {useBeforeUpdateMiddleware} from "./util" useBeforeUpdateMiddleware() // OK: called
    synchronously
</lang-js>
```
