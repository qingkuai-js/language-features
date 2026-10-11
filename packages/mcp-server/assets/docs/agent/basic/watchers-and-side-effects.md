---
description: "Qingkuai watchers and side effects: watch/effect families across four trigger timings, shorthand *Exp registration, external registration with instance binding, and cleanup semantics."
keywords: ["watch", "effect", "preWatch", "postWatch", "syncWatch", "watcher", "side effect", "cleanup", "侦听", "副作用"]
---

# Watchers and Side Effects

Watcher and side effect APIs register callbacks at different phases of the update scheduler. Inside a component file they are all built-in methods — never import them; the compiler binds them to the component instance and cleans them up automatically on unmount.

## Syntax

| API | Trigger timing | Callback |
|---|---|---|
| `watch(getter, cb)` | Normal: order vs. the update scheduler is not guaranteed; earlier registration runs earlier | `(pre, cur)` — previous and current value |
| `effect(cb)` | Normal | No arguments; reactive values read in the callback are auto-collected as dependencies |
| `preWatch(getter, cb)` / `preEffect(cb)` | Before the update scheduler and before template updates | Same shapes as above |
| `postWatch(getter, cb)` / `postEffect(cb)` | After scheduled updates complete (state and DOM settled) | Same shapes as above |
| `syncWatch(getter, cb)` / `syncEffect(cb)` | Synchronously right after a dependent value changes, before the scheduler | Same shapes as above |
| `watchExp(expr, cb)` / `preWatchExp` / `postWatchExp` / `syncWatchExp` | Same timings as their `watch` counterparts | Shorthand: the compiler wraps the first argument into a getter, so pass an expression directly |

Registration calls return a control handle: `type EffectHandle = Record<"stop" | "pause" | "resume", () => void>`, whose three methods stop, pause, and resume triggering.

## Rules

1. `watch` requires a getter as first argument; `effect` takes only a callback and combines dependency collection with reactive logic.
2. A `watch` registered synchronously before the template rendering side effect runs before the template updates; use `preWatch` to guarantee "before update" when registration happens in async logic.
3. Return a cleanup function from a watcher/effect callback; it runs before the callback triggers again (e.g. clear a timer).
4. If a callback collects no reactive dependencies (constant getter, or the read path is short-circuited by a conditional branch), the runtime warns and destroys that registration automatically.
5. Built-in registrations are auto-cleaned on component destroy, whether registered in synchronous or asynchronous logic — no manual management, no memory leaks.
6. Prefer explicit data flow and function composition over heavy watcher/effect use; these APIs are mainly a transition tool for developers coming from other frameworks and hurt maintainability when overused.

## External registration

Two ways to register outside a component file:

- Pass the component's built-in method as an argument to the external module; the created watcher/effect stays bound to that instance.
- Import the API from the `qingkuai` runtime package and pass the binding as the FIRST argument: a component instance behaves like the built-in methods; `null` creates a global watcher/side effect that is NOT auto-cleaned and must be stopped manually (`handle.stop()`).

`getCurrentInstance()` from the runtime package only returns the correct instance during the synchronous initialization/update phase — it is unpredictable in async logic. Prefer having the external module accept the instance as a parameter and pass the built-in `instance` identifier from the component.

## Constraints

- Never import `watch`/`effect` (or variants) inside a component file — they are built-ins; importing a same-named identifier is a compile error.
- To register a manually managed global effect inside a component, alias the import (e.g. `import { effect as manualEffect } from "qingkuai"`) and pass `null` as the first argument; strongly discouraged — register global watchers/effects in a module outside the component instead.
- Global watchers/side effects (`null` binding) are never cleaned up automatically; always keep the handle and call `stop()`.

## Examples

Watcher with previous/current values; DOM is still pre-update inside the callback:

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

Post-watcher sees the settled DOM:

```qk
<lang-js>
    let paragraph
    let name = "JavaScript"
    postWatch(
        () => name,
        (pre, cur) => {
            console.log(paragraph.textContent) // logs: name is: QingKuai
        }
    )
</lang-js>

<p &handle={paragraph}>name is: {name}</p>
<button @click={name = "Qingkuai"}>Change Name</button>
```

Effect with auto dependency collection:

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

Cleanup function returned from a callback (plain js module):

```js
let timer

watchExp(identifier, (pre, cur) => {
    timer = setTimeout(() => {}, 1000)
    return () => clearTimeout(timer) // runs before the watcher triggers again
})
```

Global side effect with manual lifecycle (plain js module):

```js
import { effect } from "qingkuai"

const handle = effect(null, () => {})
handle.stop()
```

## See also

- [Reactivity](docs://agent/basic/reactivity.md)
- [Built-in Identifiers](docs://agent/references/intrinsics.md)
- [Runtime Package API](docs://agent/references/api.md)
