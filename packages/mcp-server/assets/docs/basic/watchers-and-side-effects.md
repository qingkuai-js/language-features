# Watchers and Side Effects

The watcher and side effect APIs are part of Qingkuai's reactivity system. They let you register callbacks at different phases of the update scheduler so that related logic can run when reactive values change. Based on when they are triggered, these APIs can be divided into the following groups:

- `watch`, `effect`: normal registration. Their order relative to the update scheduler is not guaranteed. Earlier registrations run earlier.
- `syncWatch`, `syncEffect`: triggered immediately after a dependent reactive value changes, before the async update scheduler runs.
- `preWatch`, `preEffect`: triggered before the update scheduler. They are suitable for logic that needs to run after state changes but before scheduled updates.
- `postWatch`, `postEffect`: triggered after scheduled updates are complete. They are suitable when you need to wait until state and DOM updates have settled.

Inside a [component file](docs://references/terminology.md#component-file), the watcher and side effect APIs are all [built-in methods](docs://references/terminology.md#built-in-methods) — there is no need to import them from the runtime package. The compiler generates methods bound to the [component](docs://components/basic.md) as needed for the API calls, so every watcher and side effect registered inside a component is correctly bound to the [component instance](docs://references/terminology.md#component-instance). As a result, you do not need to worry about memory leaks: they are all stopped and their memory released when the component unmounts, whether they were registered in synchronous or asynchronous logic.

<div class="custom-block warning">The watcher and side effect APIs are mainly intended as transition tools for developers coming from frameworks such as <a href="https://cn.vuejs.org">Vue</a>. They help lower the learning curve during migration. However, we do not recommend using these APIs heavily in production projects. Side effects are usually registered as callbacks, and their trigger locations do not appear directly in the call stack, which makes the call chain less intuitive and harder to trace. This pattern also makes it less convenient to rely on IDE features such as go-to-definition and find references for efficient review and maintenance. If your project values maintainability and readability, prefer explicit data flow and function composition when organizing reactive logic.</div>

---

## Watchers

In the following example, a watcher is registered for the `name` variable. When its value changes, the callback runs. The callback receives two arguments: the previous value and the current value. Because the watcher is registered before the template rendering side effect, the DOM accessed in the callback is still in its pre-update state:

|js|ts|

```qk
<lang-js>
    let paragraph
    let name = "JavaScript"
    watch(
        () => name,
        (pre, cur) => {
            console.log(pre, cur) // JavaScript Qingkuai
            console.log(paragraph.textContent) // name is: JavaScript
        }
    )
</lang-js>

<p &dom={paragraph}>name is: {name}</p>
<button @click={name = "Qingkuai"}>Change Name</button>
```

```qk
<lang-ts>
    let name = "JavaScript"
    let paragraph!: HTMLParagraphElement
    watch(
        () => name,
        (pre, cur) => {
            console.log(pre, cur) // JavaScript Qingkuai
            console.log(paragraph.textContent) // name is: JavaScript
        }
    )
</lang-ts>

<p &dom={paragraph}>name is: {name}</p>
<button @click={name = "Qingkuai"}>Change Name</button>
```

### Pre-Watchers

A watcher registered synchronously through `watch` inside an embedded language tag is registered earlier than the template rendering side effect, so its callback runs before the template updates. If the watcher is registered in async logic, that order is no longer guaranteed. In that case, use `preWatch` to ensure that the callback runs before the template update:

|js|ts|

```qk
<lang-js>
    let paragraph
    let name = "JavaScript"
    preWatch(
        () => name,
        (pre, cur) => {
            console.log(pre, cur) // JavaScript Qingkuai
            console.log(paragraph.textContent) // name is: JavaScript
        }
    )
</lang-js>

<p &dom={paragraph}>name is: {name}</p>
<button @click={name = "Qingkuai"}>Change Name</button>
```

```qk
<lang-ts>
    let name = "JavaScript"
    let paragraph!: HTMLParagraphElement
    preWatch(
        () => name,
        (pre, cur) => {
            console.log(pre, cur) // JavaScript Qingkuai
            console.log(paragraph.textContent) // name is: JavaScript
        }
    )
</lang-ts>

<p &dom={paragraph}>name is: {name}</p>
<button @click={name = "Qingkuai"}>Change Name</button>
```

### Post-Watchers

A post-watcher is the opposite of a pre-watcher. It runs after scheduled updates have finished, so it is suitable for logic that needs to wait until the state is stable or the DOM has been updated:

|js|ts|

```qk
<lang-js>
    let paragraph
    let name = "JavaScript"
    postWatch(
        () => name,
        (pre, cur) => {
            console.log(pre, cur) // JavaScript Qingkuai
            console.log(paragraph.textContent) // name is: Qingkuai
        }
    )
</lang-js>

<p &dom={paragraph}>name is: {name}</p>
<button @click={name = "Qingkuai"}>Change Name</button>
```

```qk
<lang-ts>
    let name = "JavaScript"
    let paragraph!: HTMLParagraphElement
    postWatch(
        () => name,
        (pre, cur) => {
            console.log(pre, cur) // JavaScript Qingkuai
            console.log(paragraph.textContent) // name is: Qingkuai
        }
    )
</lang-ts>

<p &dom={paragraph}>name is: {name}</p>
<button @click={name = "Qingkuai"}>Change Name</button>
```

### Synchronous Watchers

The callbacks of `watch`, `preWatch`, and `postWatch` are all triggered asynchronously. If you need synchronous execution, use `syncWatch`:

```qk
<lang-js>
    let name = "JavaScript"

    function handleChangeName() {
        name = "Qingkuai" // logs: JavaScript Qingkuai
    }

    syncWatch(
        () => name,
        (pre, cur) => {
            console.log(pre, cur)
        }
    )
</lang-js>

<p>name is: {name}</p>
<button @click={handleChangeName}>Change Name</button>
```

### Convenience Registration

In standard watcher registration, the first argument must be a `getter` function that returns the value being observed. This is slightly verbose for simple expressions. To address that, the compiler provides a group of convenience registration methods similar in spirit to [derivedExp](/basic/reactivity.md#derived-reactive-state): `watchExp`, `preWatchExp`, `postWatchExp`, and `syncWatchExp`. The compiler automatically converts the first argument of these methods into a `getter` function, so you can pass an expression directly:

```js
// Normal watcher registration
watchExp(identifier, (pre, cur) => {
    console.log(pre, cur)
})

// Register a pre-watcher
preWatchExp(identifier, (pre, cur) => {
    console.log(pre, cur)
})

// Register a post-watcher
postWatchExp(identifier, (pre, cur) => {
    console.log(pre, cur)
})

// Register a synchronous watcher
syncWatchExp(identifier, (pre, cur) => {
    console.log(pre, cur)
})
```

---

## Side Effects

Unlike watchers, `effect` only accepts a callback. Dependency collection and reactive logic are combined into one place: the reactive values accessed while the callback runs are collected automatically as dependencies, and the callback runs again whenever any of them changes. In the following example, the `effect` callback accesses `userId`, so every time `userId` changes, a new request is sent and the user information is updated:

|js|ts|

```qk
<lang-js>
    let userId = 0
    let userInfo = null
    effect(async () => {
        const response = await fetch(`https://example.com/user/info/${userId}`)
        userInfo = await response.json()
    })
</lang-js>

<qk:spread #if={userInfo}>
    <p>User id: {userInfo.id}</p>
    <p>User name: {userInfo.name}</p>
</qk:spread>
```

```qk
<lang-ts>
    interface UserInfo {
        id: number
        name: string
    }

    let userId = 0
    let userInfo: UserInfo | null = null
    effect(async () => {
        const response = await fetch(`https://example.com/user/info/${userId}`)
        userInfo = await response.json()
    })
</lang-ts>

<qk:spread #if={userInfo}>
    <p>User id: {userInfo.id}</p>
    <p>User name: {userInfo.name}</p>
</qk:spread>
```

`effect` is also a built-in method of component files and can be called directly without any import. The side effect APIs also provide registration methods for different trigger timings:

```js
preEffect(() => {})
postEffect(() => {})
syncEffect(() => {})
```

---

## Importing from the Runtime Package

To use the watcher and side effect APIs outside [component files](docs://references/terminology.md#component-file), import the corresponding methods from the `qingkuai` runtime package:

```js
import { watch, effect, preWatch, postWatch, syncWatch } from "qingkuai"
```

Unlike the built-in methods in component files, these runtime-imported methods **do not bind the current component instance automatically**. The first argument is a [component instance](docs://references/terminology.md#component-instance) or `null`, which specifies how the registration is bound; the remaining arguments are the same as the built-in methods of a component.

The value of the first argument determines how the registration is cleaned up:

- **Pass a component instance**: the registration is linked to that component's destruction lifecycle. Whether registered synchronously or asynchronously, it is cleaned up automatically when the component is destroyed.
- **Pass `null`**: the registration is not linked to any component and is never cleaned up automatically. You must manage its lifecycle manually by calling `stop` on the returned handle.

It is worth emphasizing that we **strongly discourage** registering global watchers and side effects inside a component; a reasonable design is usually to register such global side effects in an external `js` / `ts` module. If you really need to register one inside a component, you can import the corresponding API from the runtime package and pass `null` as the first argument to register a watcher or side effect that you manage manually:

```qk
<lang-js>
    import { effect as manualEffect } from "qingkuai"

    const handle = manualEffect(null, () => {
        // ...
    })

    handle.stop()
</lang-js>
```

<div class="custom-block warning">Here you must alias the imported API (such as <code>manualEffect</code>). Because the component file already has built-in methods with the same names, importing an identifier with the same name directly triggers a compile error. This restriction is intentional — we hope this awkward usage makes you realize that you may be using an anti-pattern that we do not recommend.</div>

Outside component files, the most common approach is to pass `null` and let the caller manage the lifecycle manually:

```js
import { watch, effect } from "qingkuai"

const watchHandle = watch(
    null,
    () => count,
    (pre, cur) => {
        // ...
    }
)

const effectHandle = effect(null, () => {
    // side effect logic ...
})

// Stop and release resources manually
watchHandle.stop()
effectHandle.stop()
```

If you want the registration to be cleaned up automatically when the component is destroyed, you need to obtain a binding to a component instance. There are two common ways to do so:

**1. Accept the component's built-in `effect` / `watch` method as an argument**

The built-in `effect`, `watch`, and other methods inside a component file are already bound to the current component instance. You can pass them as arguments to an external module, which calls these methods to create watchers or side effects bound to the corresponding component instance:

```qk
<lang-js>
    import { collectEffects } from "./utils"

    // Pass the component's built-in effect method as an argument to the external module
    collectEffects(effect)
</lang-js>
```

In the external module, the full type of the `effect` argument is `EffectFunc` (and `WatchFunc` for `watch`):

|js|ts|

```js
// External module: accepts the component's built-in effect method as an argument
export function collectEffects(effect) {
    effect(() => {
        // ...
    })
}
```

```ts
import type { EffectFunc } from "qingkuai"

// External module: accepts the component's built-in effect method as an argument
export function collectEffects(effect: EffectFunc) {
    effect(() => {
        // ...
    })
}
```

**2. Get the current component instance via `getCurrentInstance`**

You can also import `getCurrentInstance` from the `qingkuai` runtime package, synchronously obtain the current component instance in the component logic, and pass it to the watcher or side effect APIs:

```qk
<lang-js>
    import { getCurrentInstance, effect } from "qingkuai"

    const instance = getCurrentInstance()
    effect(instance, () => {
        // ...
    })
</lang-js>
```

---

## Cleaning Up Watchers and Side Effects

### Automatic Cleanup

Watchers or side effects created with the [built-in methods](docs://references/terminology.md#built-in-methods) inside a component file are cleaned up automatically when the component is destroyed — whether registered synchronously or asynchronously, no manual management is needed. When external modules import and use these APIs from the `qingkuai` runtime package, the cleanup behavior depends on the first argument passed (see [Importing from the Runtime Package](#importing-from-the-runtime-package) above).

### Manual Cleanup

Watcher and side effect registration methods all return a control handle object with the following type:

```ts
type EffectHandle = Record<"stop" | "pause" | "resume", () => void>
```

These three methods are used to stop, pause, and resume a watcher or side effect:

```js
const effectHandlers = effect(() => {
    // effect logic ...
})
effectHandlers.stop() // stop and clean up the side effect
effectHandlers.pause() // pause the side effect
effectHandlers.resume() // resume the paused side effect

const watchHandlers = watchExp(identifier, (pre, cur) => {
    // watch logic ...
})
watchHandlers.stop() // stop and clean up the watcher
watchHandlers.pause() // pause the watcher
watchHandlers.resume() // resume the paused watcher
```

### Cleanup Functions

In some cases, a watcher or side effect needs to run cleanup logic before it runs again. For example, if it registers a timer, that timer should be cleared before the next trigger to avoid memory leaks or logic errors. In that case, wrap the cleanup logic in a function and return it from the callback:

|js|ts|

```js
let timer

watchExp(identifier, (pre, cur) => {
    timer = setTimeout(() => {
        // do something ...
    }, 1000)

    return () => clearTimeout(timer) // runs before the watcher triggers again
})
```

```ts
let timer: number

watchExp(identifier, (pre, cur) => {
    timer = window.setTimeout(() => {
        // do something ...
    }, 1000)

    return () => clearTimeout(timer) // runs before the watcher triggers again
})
```

### Passive Cleanup

If a watcher or side effect callback collects no reactive dependencies during execution, the runtime emits a warning and destroys that registration automatically. Once destroyed, all resources (including memory) held by the effect are released because it will never be triggered again:

```qk
<lang-js>
    effect(() => {
        // The callback does not read any reactive value
        console.log("No dependencies, will be destroyed after this run")
    })

    watch(
        () => "constant",
        (pre, cur) => {
            // The getter returns a constant, no reactive link is established
            console.log("This watcher will also be destroyed")
        }
    )
</lang-js>
```

This usually means the callback did not read reactive values, or dependency reads were skipped by control flow:

```qk
<lang-js>
    let flag = true
    let value = reactive("hello")

    effect(() => {
        // When flag is true, only returns a constant without reading any reactive value
        if (flag) {
            console.log("no reactive deps")
            return
        }
        console.log(value) // This line is never reached
    })
</lang-js>
```
