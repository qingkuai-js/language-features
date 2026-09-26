# FAQ

This page collects frequently asked questions about using Qingkuai, together with the reasoning behind some design decisions. If a certain behavior confuses you, look here first for an answer.

---

## Why are watchers, side effects, contexts, and lifecycle hooks built-in methods?

Runtime APIs such as watchers, side effects, contexts, and lifecycle hooks are all closely tied to the component instance: they work while attached to a component instance and are cleaned up when that instance unmounts. Many frameworks implement them by implicitly binding them to "the component instance currently being initialized" (for example, obtained via `getCurrentInstance`). This kind of binding relies on the call timing of the runtime. Once these calls appear inside asynchronous logic, it becomes hard to predict which instance "the current instance" refers to: at best they bind to the wrong component, at worst they throw a runtime error outright, and this is often accompanied by memory leaks that are hard to track down.

Qingkuai takes an explicit-binding approach. In a component file, you do not need to pass in the component instance: these APIs are provided as [built-in methods](docs://references/intrinsics.md) that can be called directly without any import. The compiler binds them to the current component instance automatically and cleans them up automatically when the component unmounts:

```js
// Context: readable by this component and its descendant components after being written
setContext("theme", "dark")

// Lifecycle hook: runs after the component is mounted
onAfterMount(() => {
    console.log("component mounted")
})
```

Outside a component file (for example, registering a watcher in a global state module or a utility function), use the corresponding API imported from the [runtime package](docs://references/terminology.md#runtime-package) and explicitly pass the target instance as the first argument (usually obtained inside the component via the built-in `instance` identifier and then passed out):

```js
import { watch } from "qingkuai"

export function watchUserInfo(instance, callback) {
    // The binding relationship is written at the call site, plain at a glance
    return watch(instance, callback)
}
```

If `null` is passed in, a [global watcher or global side effect](docs://references/terminology.md#global-watcher) bound to no component is created, and its lifecycle must be managed by yourself.

In either form, every binding relationship is written at the call site, predictable and as expected, instead of relying on runtime timing to figure out which instance is "the current one"; when the component unmounts, the bound watchers, side effects, and context data are safely removed and their memory released. This eliminates, at the mechanism level, the unstable bugs and memory leaks caused by runtime timing. For more details, see [External Registration of Watchers and Side Effects](docs://basic/watchers-and-side-effects.md#external-registration).

---

## Why aren't identifiers accessed inside function bodies inferred as reactive?

If you are migrating from another reactive framework, you have very likely written code like this:

```js
let count = 0

function setCount(v) {
    count = v
}

function getDouble() {
    return count * 2
}
```

```qk
<div>{getDouble()}</div>
<button @click={setCount}>+1</button>
```

In Qingkuai, `count` is inferred as a raw value. The rule itself is simple: reactivity comes from being [accessed in the template](docs://references/reactivity-infer-rules.md#accessed-in-the-template), and the compiler does not dig into ordinary function bodies to analyze which identifiers they access. In other words, in the example above what is accessed in the template is `getDouble`, not `count`.

`count` staying a raw value means that the assignment in `setCount` is just an ordinary JavaScript assignment, and the view will not update. If you are not sure what a given identifier was ultimately inferred as, the IDE's [inlay hints](docs://references/reactivity-infer-rules.md#inference-hints) show its reactivity status directly at the declaration site and on hover.

To make this code work as expected, `derived`/`derivedExp` are recommended. They are the dedicated forms for computing a new value from existing reactive values: when a derived value is accessed in the template, identifiers read inside its `getter` or expression literal (including reads inside nested callbacks) are also counted as accessed in the template (see [access propagation](docs://references/reactivity-infer-rules.md#access-propagation-of-derived-sources) for details), so you usually do not need to explicitly mark the sources:

```qk
<lang-js>
    let count = 0

    function setCount(v) {
        count = v
    }

    const double = derivedExp(count * 2)
</lang-js>

<div>{double}</div>
<button @click={setCount}>+1</button>
```
