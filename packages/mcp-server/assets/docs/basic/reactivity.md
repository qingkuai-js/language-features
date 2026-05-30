---
description: ""
---

# Reactivity

In frontend development, <b>Reactivity</b> is a mechanism that keeps data state and the interface automatically in sync. Its core idea is simple: when data changes, the interface updates automatically without manual DOM operations. In the past, developers had to manipulate page elements explicitly in business logic to reflect data changes. That approach was tedious and error-prone. A reactivity system improves development efficiency and maintainability by tracking dependencies and updating automatically.

---

## Reactivity Declaration

In Qingkuai, you do not need to declare reactive variables manually. The compiler attaches reactive capability to identifiers according to the [reactivity inference rules](docs://references/reactivity-infer-rules.md). In the following example, `progress` is changed from `"pending"` to `"completed"` inside the script, and the template updates automatically. This is a simple example of reactivity:

```qk
<lang-js>
    let progress = "pending"

    setTimeout(() => {
        progress = "completed"
    }, 1000)
</lang-js>

<h1>Task status: {progress}</h1>
```

In some cases, however, you may want to prevent this default behavior. In that case, you can use the compiler built-in `raw` method to mark the identifier as static so that reactive capability is not added. In the following example, changing `progress` does not update the page:

```qk
<lang-js>
    let progress = raw("pending")

    setTimeout(() => {
        progress = "completed"
    }, 1000)
</lang-js>

<h1>Task status: {progress}</h1>
```

For identifiers that are not accessed in the template, you can also mark them manually with the compiler built-ins `reactive` or `shallow` if they should still have reactive capability:

```js
let progress = reactive("pending") // reactive
```

<div class="custom-block warning">
    In general, we do not recommend doing this, because in most cases you probably only want reactive capability inside script logic. Qingkuai is designed around the idea that reactivity is mainly for scenarios where the page needs to update automatically. In scripts, it is usually better to organize logic with function composition and similar patterns instead of relying too heavily on reactivity. In addition, operating on reactive data introduces some overhead. Overusing it often makes change flows less intuitive, harder to express clearly in code, and less convenient to inspect through IDE navigation or code review.
</div>

---

## Reactive Aliases

Alias binding in Qingkuai provides a concise way to read from and write to reactive targets. For deeply nested properties, you can create a shorter identifier alias with the compiler built-in `alias`, which simplifies reactive access code:

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

In behavior, alias binding is very similar to [pass-by-reference](https://en.wikipedia.org/wiki/Evaluation_strategy#Call_by_sharing) in some languages, but it is not exactly the same as the traditional notion of passing by reference. Internally, the compiler rewrites reads and writes to the alias identifier into reads and writes to the original target, which provides reactive access. This also has something in common with the [reference attributes](docs://basic/reference-attributes.md) introduced later.

<div class="custom-block warning">
    Alias binding can also be used with non-reactive values, but it should not be overused. It is designed primarily to simplify reactive access to deeply nested properties, so it is best used in that kind of scenario. As a best practice, prefer using it with component <a href="docs://components/attributes.md">props</a> and <a href="docs://components/attributes.md#reference-attributes">refs</a>. For other scenarios, evaluate the trade-offs carefully before using it.
</div>

---

## Reactivity Mode

Qingkuai supports two reactivity modes: deep reactivity and shallow reactivity. By default, the compiler attaches deep reactive capability to identifiers. That means even if a property is a complex type such as an object or array, reactive capability is added recursively. With shallow reactivity, only the identifier itself is reactive, and complex properties are not made reactive.

To change the default reactivity mode, add a `.qingkuairc` configuration file in the current directory or a parent directory and set:

```json
{
    "reactivityMode": "shallow"
}
```

A reactivity mode configured through a file takes effect for the current directory and all of its subdirectories until another configuration file is encountered. If you want to use a different reactivity mode in a single component file, you can override the default by adding a `reactive` or `shallow` attribute to the embedded script tag:

```qk
<lang-js shallow>
    // The compiler infers whether identifiers have shallow reactivity
</lang-js>

<lang-js reactive>
    // The compiler infers whether identifiers have deep reactivity
</lang-js>
```

---

## Getting Raw Values

When an identifier of a complex type is inferred as reactive, its properties are also inferred as reactive recursively. This means that when you access that value or its properties, you usually get a reactive proxy object wrapped by the compiler rather than the raw value. In some scenarios, you may need the raw value for comparison or other operations. In that case, use the `toRaw` method exported from `qingkuai`:

```js
import { toRaw } from "qingkuai"

const inner = {}
const outer = reactive({ inner })
console.log(outer.inner === inner) // false
console.log(toRaw(outer.inner) === inner) // true
console.log(toRaw(outer).inner === inner) // true
```

---

## Getting Reactive Values

Qingkuai also provides `toReactive` and `toShallowReactive` to obtain the reactive proxy object corresponding to a value:

```js
import { toReactive } from "qingkuai"

const obj = { count: 0 }
const reactiveObj = toReactive(obj)
```

<div class="custom-block warning">
    Note that <code>toReactive</code> does not add new reactive capability to the passed value. It only returns that value's reactive proxy object. If the value itself was not inferred or explicitly marked as reactive by the compiler, the proxy returned by <code>toReactive</code> does not become reactive either.
</div>

---

## Derived Reactive State

Derived reactive state refers to computations that depend on other reactive values. When those reactive dependencies change, the related computation runs again automatically to produce the latest result. In Qingkuai, there are two ways to declare derived reactive state:

1. Use a variable identifier that starts with `$`.
2. Use the compiler built-in `derived` or `derivedExp`.

```js
let number = 10
const $double = number * 2
const double = derived(() => number * 2)
```

When using the shorthand declaration form, meaning an identifier starting with `$`, you can also set the initial value to a function expression if the logic is complex. The compiler automatically treats the return value of that function expression as derived reactive state:

```js
const $result = () => {
    const double = number * 2
    return isSpecial(double) ? Math.abs(double) : double
}
```

Unlike `derived`, `derivedExp` allows you to pass an expression directly to declare derived reactive state. This behaves similarly to a shorthand declaration whose initial value is not a function. For simple logic, this form is more concise:

```js
const double = derivedExp(number * 2)
```

In real development, template interpolation blocks often contain JS or TS expressions, and some of them become fairly complex. If a template is filled with complex expressions, the code quickly becomes messy and hard to read. In such cases, using derived reactive state to extract and represent those expressions is often a clearer and more efficient approach:

```qk
<lang-js>
    const $result = () => {
        const normalized = number < 0 ? Math.abs(number) : number
        return normalized * 2
    }
</lang-js>

<p>the calculation result is: {$result}</p>
```

If you do not want to use shorthand declarations for derived reactive state, add a `.qingkuairc` configuration file in the current directory or a parent directory and write:

```json
{
    "convenientDerivedDeclaration": false
}
```

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

<div class="custom-block tip">
    The <a href="docs://basic/compilation-directives.md#conditional-rendering">#if</a> used here is a <a href="docs://basic/compilation-directives.md">compilation directive</a>. It controls whether an element is rendered based on a condition. In the example above, it is used to render different content based on login status.
</div>

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

Note that shorthand declarations of derived reactive state do not support destructuring syntax:

```js
const { $code } = obj
```
