# Lifecycle

In component-based development, lifecycle is key to understanding component behavior and choosing the right execution timing. Every component goes through a series of lifecycle phases, from creation to mounting, updating, and unmounting. To give you better control over these phases, Qingkuai provides several lifecycle hook functions. Through these hooks, you can insert logic at the right time for data initialization, event binding, cleanup, and more, making components more robust and easier to maintain:

- Mounting: `onAfterMount` (after the component is mounted)
- Unmounting: `onBeforeDestroy` (before the component is unmounted), `onAfterDestroy` (after the component is unmounted)
- Updating: `onBeforeUpdate` (before each update is scheduled), `onAfterUpdate` (after update scheduling is complete)

---

## Registering Callbacks

To register a lifecycle callback, first import the corresponding hook function:

```js
import { onAfterMount } from "qingkuai"

onAfterMount(() => {
    console.log("component mounted")
})
```

<div class="custom-block tip">
    Note that the runtime API does not provide a hook named <code>onBeforeMount</code>. The entire embedded script block runs before the component is mounted, so any logic that needs to run before mount can be written there directly without an extra hook.
</div>

During rendering, Qingkuai records the component instance that is currently mounting synchronously. Because of that, you cannot register lifecycle callbacks in async logic. Do not do this:

```js
import { onBeforeDestroy } from "qingkuai"

setTimeout(() => {
    onBeforeDestroy(() => {})
})
```

However, you can register lifecycle callbacks inside external encapsulated logic, for example:

```js
// util.js
import { onBeforeUpdate } from "qingkuai"

export function useBeforeUpdateMiddleware() {
    onBeforeUpdate(() => {
        console.log("before update")
    })
}
```

```qk
<lang-js>
    import { useBeforeUpdateMiddleware } from "./util"

    useBeforeUpdateMiddleware()
    // other logics...
</lang-js>
```
