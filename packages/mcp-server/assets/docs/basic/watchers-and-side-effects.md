# Watchers and Side Effects

The watcher and side effect APIs are part of Qingkuai's reactivity system. They let you register callbacks at different phases of the update scheduler so that related logic can run when reactive values change. Based on when they are triggered, these APIs can be divided into the following groups:

- `watch`, `effect`: normal registration. Their order relative to the update scheduler is not guaranteed. Earlier registrations run earlier.
- `syncWatch`, `syncEffect`: triggered immediately after a dependent reactive value changes, before the async update scheduler runs.
- `preWatch`, `preEffect`: triggered before the update scheduler. They are suitable for logic that needs to run after state changes but before scheduled updates.
- `postWatch`, `postEffect`: triggered after scheduled updates are complete. They are suitable when you need to wait until state and DOM updates have settled.

Inside a [component file](docs://references/terminology.md#component-file), the watcher and side effect APIs are all [built-in methods](docs://references/terminology.md#built-in-methods) — there is no need to import them from the [runtime package](docs://references/terminology.md#runtime-package). The compiler generates methods bound to the [component](docs://components/basic.md) as needed for the API calls, so every watcher and side effect registered inside a component is correctly bound to the [component instance](docs://references/terminology.md#component-instance). As a result, you do not need to worry about memory leaks: they are all stopped and their memory released when the component unmounts, whether they were registered in synchronous or asynchronous logic.

> [!WARNING]
> The watcher and side effect APIs are mainly intended as transition tools for developers coming from frameworks such as [Vue](https://cn.vuejs.org). They help lower the learning curve during migration. However, we do not recommend using these APIs heavily in production projects. Side effects are usually registered as callbacks, and their trigger locations do not appear directly in the call stack, which makes the call chain less intuitive and harder to trace. This pattern also makes it less convenient to rely on IDE features such as go-to-definition and find references for efficient review and maintenance. If your project values maintainability and readability, prefer explicit data flow and function composition when organizing reactive logic.

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
            console.log(pre, cur) // logs: JavaScript Qingkuai
            console.log(paragraph.textContent) // logs: name is: Javascript
        }
    )
</lang-js>

<p &handle={paragraph}>name is: {name}</p>
<button @click={name = "Qingkuai"}>Change Name</button>
```

```qk
<lang-ts>
    let name = "JavaScript"
    let paragraph!: HTMLParagraphElement
    watch(
        () => name,
        (pre, cur) => {
            console.log(pre, cur) // logs: JavaScript Qingkuai
            console.log(paragraph.textContent) // logs: name is: Javascript
        }
    )
</lang-ts>

<p &handle={paragraph}>name is: {name}</p>
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
            console.log(pre, cur) // logs: JavaScript Qingkuai
            console.log(paragraph.textContent) // logs: name is: Javascript
        }
    )
</lang-js>

<p &handle={paragraph}>name is: {name}</p>
<button @click={name = "Qingkuai"}>Change Name</button>
```

```qk
<lang-ts>
    let name = "JavaScript"
    let paragraph!: HTMLParagraphElement
    preWatch(
        () => name,
        (pre, cur) => {
            console.log(pre, cur) // logs: JavaScript Qingkuai
            console.log(paragraph.textContent) // logs: name is: Javascript
        }
    )
</lang-ts>

<p &handle={paragraph}>name is: {name}</p>
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
            console.log(pre, cur) // logs: JavaScript Qingkuai
            console.log(paragraph.textContent) // logs: name is: QingKuai
        }
    )
</lang-js>

<p &handle={paragraph}>name is: {name}</p>
<button @click={name = "Qingkuai"}>Change Name</button>
```

```qk
<lang-ts>
    let name = "JavaScript"
    let paragraph!: HTMLParagraphElement
    postWatch(
        () => name,
        (pre, cur) => {
            console.log(pre, cur) // logs: JavaScript Qingkuai
            console.log(paragraph.textContent) // logs: name is: QingKuai
        }
    )
</lang-ts>

<p &handle={paragraph}>name is: {name}</p>
<button @click={name = "Qingkuai"}>Change Name</button>
```

### Synchronous Watchers

The callbacks of `watch`, `preWatch`, and `postWatch` are all triggered asynchronously. If you need synchronous execution, use `syncWatch`:

```qk
<lang-js>
    let name = "JavaScript"

    function handleChangeName() {
        name = "Qingkuai" // logs: Javascript QingKuai
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

In standard watcher registration, the first argument must be a `getter` function that returns the value being observed. This is slightly verbose for simple expressions. To address that, Qingkuai provides a group of convenience registration methods similar in spirit to [derivedExp](docs://basic/reactivity.md#derived-reactive-state): `watchExp`, `preWatchExp`, `postWatchExp`, and `syncWatchExp`. The compiler automatically converts the first argument of these methods into a `getter` function, so you can pass an expression directly:

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

Unlike watchers, `effect` only accepts a callback. Dependency tracking and reactive logic are combined into one: the reactive values accessed while the callback runs are collected automatically as dependencies, and the callback runs again whenever any of them changes. In the following example, the `effect` callback accesses `userId`, so every time `userId` changes, a new request is sent and the user information is updated:

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

## External Registration

Sometimes you may want to register watchers or side effects outside a component file — for example, to organize reactive logic in a standalone external module. There are two ways to do this:

- Pass the component's built-in watcher/side effect methods as arguments to the external module, which calls them to register watchers or side effects bound to the current component instance.
- Import the watcher and side effect APIs from the [runtime package](docs://references/terminology.md#runtime-package) and specify the binding through the first argument: passing a [component instance](docs://references/terminology.md#component-instance) behaves exactly like the built-in methods, while passing `null` creates a [global watcher](docs://references/terminology.md#global-watcher) or [global side effect](docs://references/terminology.md#global-side-effect) that is not bound to any component.

### Passing Built-in Methods

Because a component's built-in methods are already bound to the current component instance, passing them as arguments to an external module is a convenient way to create watchers or side effects bound to that instance:

|js|ts|

```js
// util.js
export function createEffect(effect) {
    effect(() => {
        // ...
    })
}
```

```ts
// util.ts
import type { BoundEffectFunc } from "qingkuai"

export function createEffect(effect: BoundEffectFunc) {
    effect(() => {
        // ...
    })
}
```

Inside the component, call the external module's side effect registration function and pass the built-in `effect` method as the argument:

```qk
<lang-js>
    import { createEffect } from "./util"

    createEffect(effect)
</lang-js>
```

### Importing from the Runtime Package

As described at the beginning of this section, the watcher and side effect APIs imported from the runtime package specify their binding through the first argument; in every other respect they work exactly like the built-in methods. Their advantage over the built-in methods is that the binding target can be specified dynamically:

```js
import { preWatch, getCurrentInstance } from "qingkuai"

const watchHandle = preWatch(
    getCurrentInstance(),
    () => count,
    (pre, cur) => {
        // ...
    }
)
```

In the example above, we obtain the current component instance with `getCurrentInstance` in the external module and pass it as the first argument to `preWatch`, which creates a pre-watcher bound to the current component. However, this approach has a potential pitfall: `getCurrentInstance` only returns the correct instance during the synchronous execution of a component's initialization or update phase, and its result in async logic is unpredictable. A better approach is therefore to have the external module accept the component instance as a parameter, and let the component pass in the built-in `instance` identifier:

|js|ts|

```js
// util.js
import { preWatch } from "qingkuai"

export function createPreWatch(instance) {
    preWatch(
        instance,
        () => count,
        (pre, cur) => {
            // ...
        }
    )
}
```

```ts
import type { ComponentInstance } from "qingkuai"

import { preWatch } from "qingkuai"

export function createPreWatch(instance: ComponentInstance<any>) {
    preWatch(
        instance,
        () => count,
        (pre, cur) => {
            // ...
        }
    )
}
```

```qk
<lang-js>
    import { createPreWatch } from "./util"

    createPreWatch(instance)
</lang-js>
```

Passing `null` as the first argument creates a [global watcher](docs://references/terminology.md#global-watcher) or [global side effect](docs://references/terminology.md#global-side-effect): they are not bound to any component instance, are not [cleaned up automatically](#automatic-cleanup), and their lifecycle must be managed manually. They are typically used for scenarios such as global state management or global event listeners:

```js
import { effect } from "qingkuai"

const handle = effect(null, () => {
    // ...
})

// Don't forget to clean up manually at the right time
handle.stop()
```

Note in particular that we **strongly discourage** registering global watchers or global side effects inside a component; it is usually more reasonable to register them in a module outside the component. If you really must register one inside a component, import the relevant API from the runtime package and pass `null` as the first argument to create a watcher or side effect that you manage manually:

```qk
<lang-js>
    import { effect as manualEffect } from "qingkuai"

    const handle = manualEffect(null, () => {
        // ...
    })

    handle.stop()
</lang-js>
```

> [!WARNING]
> Here the imported API must be aliased (for example as `manualEffect`). Component files already have built-in methods with the same names, so importing an identifier with the same name directly triggers a compile error. This restriction is intentional: the slightly inconvenient usage is meant to remind you that you are relying on an anti-pattern that we do not recommend.

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

    // runs before the watcher triggers again
    return () => clearTimeout(timer)
})
```

```ts
let timer: number

watchExp(identifier, (pre, cur) => {
    timer = window.setTimeout(() => {
        // do something ...
    }, 1000)

    // runs before the watcher triggers again
    return () => clearTimeout(timer)
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

This usually means the callback did not read reactive values, or the read path was short-circuited by a conditional branch:

```qk
<lang-js>
    let flag = true
    let value = reactive("hello")

    effect(() => {
        // When the flag is true, no reactive values have been read
        if (flag) {
            console.log("no reactive deps")
            return
        }
        console.log(value)
    })
</lang-js>
```
