# Lifecycle

In component-based development, lifecycle is key to understanding component behavior and grasping execution timing. Every component goes through a series of lifecycle phases, from creation to mounting, updating, and unmounting. To better control these processes, Qingkuai provides several lifecycle methods. Through these methods, you can insert logic at the right time for data initialization, event binding, cleanup, and more, making components more robust and easier to maintain:

- Mounting: `onAfterMount` (after the component is mounted)
- Unmounting: `onBeforeDestroy` (before the component is unmounted), `onAfterDestroy` (after the component is unmounted)
- Updating: `onBeforeUpdate` (triggered before each update is scheduled), `onAfterUpdate` (triggered after update scheduling is complete)

---

## Registering Callbacks

Lifecycle methods are [built-in methods](docs://references/terminology.md#built-in-methods) of component files and can be called directly without importing. The compiler binds these calls to the current component instance automatically, and the callbacks only fire during the lifecycle phases of the component they belong to:

```js
onAfterMount(() => {
    console.log("component mounted")
})
```

Because lifecycle methods are bound to the current component instance, callbacks registered in async logic are still bound to the correct component instance:

```js
setTimeout(() => {
    onBeforeDestroy(() => {
        // Fires before the component is unmounted, even when the registration happens in async logic
        console.log("the component is about to be destroyed")
    })
}, 1000)
```

> [!TIP]
> Qingkuai does not have a lifecycle method named `onBeforeMount`, because the entire embedded script block executes before the component is mounted — just write pre-mount logic directly in it.

> [!WARNING]
> If the corresponding phase has already passed at registration time, the callback will not be executed. For example, if `onAfterMount` is registered inside a `setTimeout`, the component has long been mounted by then, the callback will never trigger, and the console will receive a corresponding warning in development mode. The windows of `onBeforeUpdate` / `onAfterUpdate`, however, recur on every update, and late registrations fire normally on the next update.

---

## Registering Outside Components

If you want to encapsulate lifecycle logic outside a component (for example, in composable utility functions), you can import these methods from the `qingkuai` [runtime package](docs://references/terminology.md#runtime-package). They then differ from the built-in methods in component files: the target [component instance](docs://references/terminology.md#component-instance) must be passed explicitly as the first argument, and the callback is registered on that instance:

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

    // instance is a built-in identifier that refers to the current component instance
    useBeforeUpdateMiddleware(instance)
</lang-js>
```

> [!TIP]
> Besides passing the component instance, you can also pass the built-in lifecycle methods directly as arguments to the external module, which calls them to register callbacks bound to the current component. This pattern is similar to how [watchers and side effects](docs://basic/watchers-and-side-effects.md#external-registration) and [contexts](docs://components/contexts.md#using-outside-components) are used outside components.
