---
description: "Reactive watchers and side effects with different trigger timings and cleanup mechanisms."
---

# Scope

Watcher and side effect APIs for registering callbacks at different phases of update scheduler.

# Watcher Types

| Type        | Trigger                  | Use Case                       |
| ----------- | ------------------------ | ------------------------------ |
| `watch`     | Normal async             | Early registration, runs first |
| `preWatch`  | Before scheduled updates | Access pre-update DOM state    |
| `postWatch` | After scheduled updates  | Access updated DOM state       |
| `syncWatch` | Immediately after change | Synchronous execution          |

## Basic Watch

```js
import { watch } from "qingkuai"

watch(
    () => name, // getter function
    (pre, cur) => {
        console.log(pre, cur) // previous, current
    }
)
```

## Pre-Watch

```js
import { preWatch } from "qingkuai"

preWatch(
    () => name,
    (pre, cur) => {
        console.log(paragraph.textContent) // pre-update DOM
    }
)
```

## Post-Watch

```js
import { postWatch } from "qingkuai"

postWatch(
    () => name,
    (pre, cur) => {
        console.log(paragraph.textContent) // updated DOM
    }
)
```

## Sync Watch

```js
import { syncWatch } from "qingkuai"

syncWatch(
    () => name,
    (pre, cur) => {
        console.log(pre, cur) // runs immediately, synchronously
    }
)
```

# Convenience Registration (Expression Form)

Compiler converts expression directly to getter:

```js
import { watchExp, preWatchExp, postWatchExp, syncWatchExp } from "qingkuai"

watchExp(identifier, (pre, cur) => {})
preWatchExp(identifier, (pre, cur) => {})
postWatchExp(identifier, (pre, cur) => {})
syncWatchExp(identifier, (pre, cur) => {})
```

# Side Effects

Automatically collect dependencies from accessed reactive values:

```js
import { effect } from "qingkuai"

let userId = 0
let userInfo = null

effect(async () => {
    // userId accessed here becomes dependency
    const response = await fetch(`/user/${userId}`)
    userInfo = await response.json()
})
```

## Effect Types

```js
preEffect(() => {}) // before scheduled updates
postEffect(() => {}) // after scheduled updates
syncEffect(() => {}) // synchronous execution
```

# Cleanup Functions

```js
watchExp(identifier, (pre, cur) => {
    const timer = setTimeout(() => {
        // do something
    }, 1000)

    return () => clearTimeout(timer) // cleanup before re-run
})
```

# Control Handlers

Watcher/effect registration returns control object:

```js
type EffectHandlers = Record<"stop" | "pause" | "resume", () => void>

const handlers = effect(() => {})
handlers.stop()    // stop and cleanup
handlers.pause()   // pause execution
handlers.resume()  // resume from pause
```

# Constraints

- Lifecycle callbacks must be registered in synchronous scope (not in async logic)
- Can be registered in external encapsulated functions
- Constraint: heavy watcher/effect chains reduce readability and IDE traceability.
