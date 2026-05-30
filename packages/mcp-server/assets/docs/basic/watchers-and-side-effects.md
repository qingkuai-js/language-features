---
description: ""
---

# Watchers and Side Effects

The watcher and side effect APIs are part of Qingkuai's reactivity system. They let you register callbacks at different phases of the update scheduler so that related logic can run when reactive values change. Based on when they are triggered, these APIs can be divided into the following groups:

- `watch`, `effect`: normal registration. Their order relative to the update scheduler is not guaranteed. Earlier registrations run earlier.
- `syncWatch`, `syncEffect`: triggered immediately after a dependent reactive value changes, before the async update scheduler runs.
- `preWatch`, `preEffect`: triggered before the update scheduler. They are suitable for logic that needs to run after state changes but before scheduled updates.
- `postWatch`, `postEffect`: triggered after scheduled updates are complete. They are suitable when you need to wait until state and DOM updates have settled.

<div class="custom-block warning">The watcher and side effect APIs are mainly intended as transition tools for developers coming from frameworks such as <a href="https://cn.vuejs.org">Vue</a>. They help lower the learning curve during migration. However, we do not recommend using these APIs heavily in production projects. Side effects are usually registered as callbacks, and their trigger locations do not appear directly in the call stack, which makes the call chain less intuitive and harder to trace. This pattern also makes it less convenient to rely on IDE features such as go-to-definition and find references for efficient review and maintenance. If your project values maintainability and readability, prefer explicit data flow and function composition when organizing reactive logic.</div>

---

## Watchers

In the following example, a watcher is registered for the `name` variable. When its value changes, the callback runs. The callback receives two arguments: the previous value and the current value. Because the watcher is registered before the template rendering side effect, the DOM accessed in the callback is still in its pre-update state:

|js|ts|

```qk
<lang-js>
    import { watch } from "qingkuai"

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
    import { watch } from "qingkuai"

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
    import { preWatch } from "qingkuai"

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
    import { preWatch } from "qingkuai"

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
    import { postWatch } from "qingkuai"

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
    import { postWatch } from "qingkuai"

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
    import { syncWatch } from "qingkuai"

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

In standard watcher registration, the first argument must be a getter function that returns the value being observed. This is slightly verbose for simple expressions. To address that, the compiler provides a group of convenience registration methods similar in spirit to [derivedExp](docs://basic/reactivity.md#derived-reactive-state): `watchExp`, `preWatchExp`, `postWatchExp`, and `syncWatchExp`. The compiler automatically converts the first argument of these methods into a getter function, so you can pass an expression directly:

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
    import { effect } from "qingkuai"

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
    import { effect } from "qingkuai"

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

The side effect APIs also provide registration methods for different trigger timings:

```js
preEffect(() => {})
postEffect(() => {})
syncEffect(() => {})
```

---

## Cleaning Up Watchers and Side Effects

Watcher and side effect registration methods all return a control handle object with the following type:

```ts
type EffectHandlers = Record<"stop" | "pause" | "resume", () => void>
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
