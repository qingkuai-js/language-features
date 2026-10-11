# Reactivity

In frontend development, <b>Reactivity</b> is a mechanism that keeps data state and the interface automatically in sync. Its core idea is: when data changes, the interface updates automatically without manual DOM operations. In the past, developers had to manipulate page elements explicitly in business logic to reflect data changes. That approach was tedious and error-prone. A reactivity system greatly improves development efficiency and code maintainability by tracking dependencies and updating automatically.

---

## Reactivity Declaration

In Qingkuai, you do not need to declare reactive variables manually. The compiler attaches reactive capability to identifiers according to the [reactivity inference rules](docs://references/reactivity-infer-rules.md). In the following example, `progress` is changed from `pending` to `completed` inside the script, and the template updates automatically. This is a simple example of reactivity:

```qk
<lang-js>
    let progress = "pending"

    setTimeout(() => {
        progress = "completed"
    }, 1000)
</lang-js>

<h1>Task status: {progress}</h1>
```

In some cases, however, you may want to prevent this default behavior. In that case, you can use the built-in `raw` method to mark that the identifier does not need reactivity, so that reactive capability is not added to it. In the following code, changing `progress` does not cause the page to update:

```qk
<lang-js>
    let progress = raw("pending")

    setTimeout(() => {
        progress = "completed"
    }, 1000)
</lang-js>

<h1>Task status: {progress}</h1>
```

> [!TIP]
> The `raw` here is only used to explicitly mark that the declared identifier itself is not reactive. If the initial value itself is reactive, its reactivity capability will not be removed; to remove the reactivity of the initial value, use the `toRaw` method to [get the raw value](#getting-raw-values).

Of course, you can also use the built-in `reactive` or `shallow` methods to proactively mark it as needing reactivity (see [Reactivity Mode](#reactivity-mode) for the difference between them):

```js
let progress = reactive("pending") // reactive
```

> [!WARNING]
> If you simply want to use reactivity capability on its own in scripts, we do not recommend doing so. The reactivity system is designed to drive the view to update automatically as data changes, not to act as a general-purpose state management tool inside scripts. When organizing logic in scripts, prefer conventional programming approaches such as function composition and avoid over-relying on reactivity mechanisms. On the other hand, operating on reactive data carries a certain runtime overhead, and overuse makes the change chain implicit: data flow becomes unintuitive, which hurts the clarity of execution logic and reduces the efficiency of code navigation and review.

---

## Reactive Aliases

Alias binding in Qingkuai provides a concise way to read from and write to reactive targets. For deeply nested properties, you can create a shorter identifier alias with the built-in `alias`, which simplifies reactive access code:

```qk
<lang-js>
    let name = alias(refs.userInfo.detail.information.name)

    // name -> refs.userInfo.detail.information.name
    // Writing to name is reactive and equivalent to writing to refs.userInfo.detail.information.name
    setTimeout(() => {
        name = "Unknown"
    }, 1000)
</lang-js>

<!-- name -> refs.userInfo.detail.information.name -->
<!-- Reading name is reactive and equivalent to reading refs.userInfo.detail.information.name -->
<p>User name is: {name}</p>
```

In behavior, alias binding is very similar to [pass-by-reference](https://en.wikipedia.org/wiki/Evaluation_strategy#Call_by_sharing) in other languages, but it is not exactly the same as the traditional notion of passing by reference. Under the hood, the compiler rewrites reads and writes to the alias identifier into reads and writes to the original identifier, which provides reactive read/write capability. This also has something in common with the [reference attributes](docs://basic/reference-attributes.md) introduced later.

> [!WARNING]
> Alias binding can also be used with non-reactive values, but it should not be overused. It is designed primarily to simplify reactive access to deeply nested properties, so it is best used in that kind of scenario. As a best practice, prefer using it with component [props](docs://components/attributes.md) and [refs](docs://components/attributes.md#reference-attributes). For other scenarios, evaluate the trade-offs carefully before using it.

---

## Reactivity Mode

Qingkuai supports two reactivity modes: deep reactivity and shallow reactivity. By default, the compiler attaches deep reactive capability to identifiers. That means even if a property is a complex type such as an object or array, reactive capability is added recursively. With shallow reactivity, only the identifier itself is reactive, and complex properties are not made reactive.

To change the default reactivity mode, add a `.qingkuairc` configuration file in the current directory or a parent directory and set:

```json
{
    "reactivityMode": "shallow"
}
```

> [!TIP]
> The configuration above can be combined with setting [`allowConstReactive`](docs://misc/config-files.md#allowconstreactive) to `false`, putting the application into a `signal`-like reactive mode with very low overhead — see [Signal Mode](docs://misc/optimization.md#signal-mode).

A reactivity mode configured through a file takes effect for the current directory and all of its subdirectories until another configuration file is encountered. If you want to use a different reactivity mode in a single component file, you can override the default by adding a `reactive` or `shallow` attribute to the embedded script tag:

```qk
<lang-js shallow>
    // The compiler infers whether identifiers have shallow reactivity
</lang-js>

<lang-js reactive>
    // The compiler infers whether identifiers have deep reactivity
</lang-js>
```

The core difference between the two reactivity modes is whether reactivity propagates level by level along nested structures: for a value marked with `reactive`, the value itself and its properties at any depth are recursively given reactive capability, so changes at any level trigger updates; a value marked with `shallow` only maintains reactivity at the shallow level, and changes at deeper levels are plain JS operations that trigger no updates:

```js
const target = {
    count: 0,
    user: {
        name: "Alice"
    }
}
let deepState = reactive(target)
let shallowState = shallow(target)

// Reassignment is reactive in both modes and triggers an update
deepState = {
    count: 1,
    user: {
        name: "Bob"
    }
}
shallowState = {
    count: 1,
    user: {
        name: "Bob"
    }
}

// Deep reactivity: nested property changes trigger an update
deepState.user.name = "Charlie"

// Shallow reactivity: nested property changes do not trigger an update
shallowState.user.name = "Charlie"
```

For identifiers declared with `const`, the binding cannot be reassigned, so `shallow` instead adds reactive capability to the first-level properties, while `reactive` still processes all nested properties recursively:

```js
const config = {
    api: {
        baseURL: "/api",
        timeout: 1000
    }
}
const deepConfig = reactive(config)
const shallowConfig = shallow(config)

// Both trigger an update: api is a first-level property
deepConfig.api = {
    baseURL: "/api",
    timeout: 2000
}
shallowConfig.api = {
    baseURL: "/api",
    timeout: 2000
}

// Only deep reactivity triggers an update: timeout is at the second level
deepConfig.api.timeout = 3000
shallowConfig.api.timeout = 3000
```

Beyond update behavior, the two also differ in what they return when properties are read: with deep reactivity, a property read returns a reactive proxy object, while with shallow reactivity the read returns the raw value itself:

```js
const target = { inner: {} }
const deepState = reactive(target)
const shallowState = shallow(target)

console.log(deepState.inner === target.inner) // logs: false
console.log(shallowState.inner === target.inner) // logs: true
```

> [!TIP]
> Deep reactivity is more intuitive, but every property access needs to wrap nested values recursively, which is costly for large or deeply nested data structures. If the data is always updated by wholesale replacement (such as reassigning an entire list), or contains third-party objects that should not be proxied (class instances, DOM objects, and so on), mark it with `shallow` to avoid unnecessary deep wrapping; conversely, if you need to react to nested property changes, use `reactive`.

---

## Getting Raw Values

When an identifier of a complex type is inferred as reactive, its properties are also inferred as reactive recursively. This means that when you access that value or its properties, you usually get a reactive proxy object wrapped by the compiler rather than the raw value. In some scenarios, you may need the raw value for comparison or other operations. In that case, use the `toRaw` method exported from `qingkuai`:

```js
import { toRaw } from "qingkuai"

const inner = {}
const outer = reactive({ inner })
console.log(outer.inner === inner) // logs: false
console.log(toRaw(outer.inner) === inner) // logs: true
console.log(toRaw(outer).inner === inner) // logs: true
```

---

## Getting Reactive Values

Qingkuai also provides the `toReactive` and `toShallow` methods to obtain the reactive proxy object corresponding to a value:

```js
import { toReactive } from "qingkuai"

const obj = { count: 0 }
const reactiveObj = toReactive(obj)
```

> [!WARNING]
> Note that `toReactive` does not add new reactive capability to the passed value. It only returns that value's reactive proxy object. If the value itself was not inferred or explicitly marked as reactive by the compiler, the proxy returned by `toReactive` does not become reactive either.

---

## Derived Reactive State

Derived reactive state refers to computations that depend on other reactive values. When those reactive dependencies change, the computation re-executes the next time the derived state is read, returning the latest result. In Qingkuai, you declare derived reactive state with the built-in methods `derived` or `derivedExp`:

```js
let number = 10
const double = derived(() => number * 2)
```

Unlike `derived`, `derivedExp` allows you to pass an expression directly to declare derived reactive state. For simple logic, this form is more concise:

```js
const double = derivedExp(number * 2)
```

In real development, template interpolation blocks often contain JS or TS expressions, and some of them become fairly complex. If a template is filled with complex expressions, the code quickly becomes messy and hard to read. In such cases, using derived reactive state to extract and represent those expressions is often a clearer and more efficient approach:

```qk
<lang-js>
    const result = derived(() => {
        const normalized = number < 0 ? Math.abs(number) : number
        return normalized * 2
    })
</lang-js>

<p>the calculation result is: {result}</p>
```

---

## Non-reactive Reads

When a reactive value is read in a template [interpolation block](docs://basic/interpolation.md) or in [watchers and side effects](docs://basic/watchers-and-side-effects.md), the read establishes a dependency by default. If you only want to read the current value without its changes triggering re-evaluation, you need a **non-reactive read**, that is, pausing dependency tracking during evaluation. This can be achieved with the [runtime API](docs://references/api.md#runtime) `noTracking`, which pauses dependency tracking while the passed function executes:

```js
import { noTracking } from "qingkuai"

let count = reactive(0)
let message = reactive("hello")

// updates of message do not trigger summary to be re-evaluated
const summary = derived(() => {
    return count + noTracking(() => message)
})
```

Note that `noTracking` only pauses dependency tracking and does not change the type of the evaluation result. If you subsequently need to access properties of its return value, dependencies may still be established:

```js
import { noTracking } from "qingkuai"

let user = reactive({ name: "Qingkuai" })

// updates of user do not trigger summary to be re-evaluated
// updates of user.name do trigger summary to be re-evaluated
const summary = derived(() => {
    return noTracking(() => user).name
})
```

If you want to obtain the raw value during a non-reactive read, you can use it together with the `toRaw` method:

```js
import { noTracking, toRaw } from "qingkuai"

let count = reactive(0)
let user = reactive({ name: "Qingkuai" })

// updates of user do not trigger summary to be re-evaluated
// updates of user.name do not trigger summary to be re-evaluated
const summary = derived(() => {
    return count + noTracking(() => toRaw(user)).name
})
```

Although the example above achieves the goal, it is still somewhat cumbersome to write. In that case, you can use the built-in method `raw` to achieve the same result. Besides marking [reactivity declarations](#reactivity-declaration), it can also perform a **non-reactive read**:

```js
import { noTracking, toRaw } from "qingkuai"

let count = reactive(0)
let user = reactive({ name: "Qingkuai" })

// updates of user do not trigger summary to be re-evaluated
// updates of user.name do not trigger summary to be re-evaluated
const summary = derivedExp(count + raw(user).name)
```

A non-reactive read is not "frozen": reads wrapped by `raw` register no dependencies, so changes to their values do not trigger re-evaluation; but when other tracked dependencies in the same expression change and trigger a re-evaluation, the non-reactive parts are re-executed as well and get the latest values. Observe the evaluation result of `result` in the example below:

```js
let count = reactive(0)
let factor = reactive(1)

// reading count registers a dependency; factor is only read via raw, so it registers none
const result = derivedExp(count + raw(factor))

// does not cause result to re-compute
factor = 100

// the next read of result re-computes it to 110
// showing that the raw part reads the latest value of factor
count = 10
```

At the rendering level, a `raw` read creates no render side effect: it is evaluated only once on the initial render, and subsequent dependency changes do not trigger an update:

```qk
<lang-js>
    let config = loadConfig()
    let visible = reactive(true)
</lang-js>

<!-- creates no render side effect, evaluated only once on the initial render -->
<p>{raw(config.detail)}</p>
```

But when the [conditional rendering](docs://basic/compilation-directives.md#conditional-rendering) or [list rendering](docs://basic/compilation-directives.md#list-rendering) it lives in re-renders, the non-reactive reads inside are also re-evaluated with the current values:

```qk
<!-- when changes of visible cause a re-render, config is re-evaluated -->
<p #if={visible}>{raw(config.detail)}</p>
```

> [!TIP]
> The [#if](docs://basic/compilation-directives.md#conditional-rendering) used here is a [compilation directive](docs://basic/compilation-directives.md), which we will cover in a later chapter. It controls whether an element is rendered based on the condition in its directive value.

---

## Reactive State Store

In many cases, you need to declare reactive variables not only inside a component, but also outside components, or even share them among multiple components. In that case, you can use Qingkuai's reactive state store API to create and export reactive variables externally:

```js
// store.js
import { createStore } from "qingkuai"

export const store = createStore({
    isLogin: false,
    userInfo: null
    // other properties ...
})
```

Importing it in multiple components lets them share the same reactive state:

```qk
<!-- Header.qk -->
<lang-js>
    import { store } from "./store"

    function handleLogin(){
        /* ... */
    }
</lang-js>

<header>
    <button
        #if={!store.isLogin}
        @click={handleLogin}
    >
        Login
    </button>
    <p #else>Hello {store.userInfo.name}</p>
</header>
```

```qk
<!-- UserCard.qk -->
<lang-js>
    import { store } from "./store"
</lang-js>

<qk:spread #if={store.isLogin}>
    <p>{store.userInfo.name}</p>
    <p>{store.userInfo.gender}</p>
</qk:spread>
```

> [!TIP]
> The [#if](docs://basic/compilation-directives.md#conditional-rendering) used here is a [compilation directive](docs://basic/compilation-directives.md), which we will cover in a later chapter. It controls whether an element is rendered based on a condition. In the example above, we used it to implement conditional rendering based on the login status.

---

## Destructuring Reactive Declarations

When you need to extract multiple properties from a reactive object, destructuring assignment is a natural way to simplify the code. In Qingkuai, if you destructure a reactive object and want the destructured variables to keep reactive capability, you can use normal JavaScript destructuring syntax directly, and the compiler adds reactive capability to the destructured variables automatically:

```js
// Destructuring reactive declarations inferred by the compiler
const { code, msg } = obj
const [start, end] = range

// Destructuring reactive declarations marked explicitly
const { code, msg } = reactive(obj)
const [start, end] = derivedExp(range.map(Math.ceil))
```

In addition, `alias` also supports destructuring syntax:

```js
const { code, msg } = alias(refs.response)
```
