# Contexts

In component-based development, some data needs to be shared with all descendants of a component, such as theme colors, the current logged-in user, or the active locale. Passing such data down through attributes forces every intermediate component to declare and forward data it does not actually need. While the [reactive state store](docs://basic/reactivity.md#reactive-state-store) can also share data across components, it requires consumers to explicitly import the state module, and the data flow is scattered across those import sites. Contexts, on the other hand, provide a communication channel that flows top-down along the component tree: a component writes data into its own contexts layer, and all of its descendant components can read it directly — no layer-by-layer passing, and no need to know which ancestor the data came from. This implicit injection is especially suitable for data such as themes and locales, which is provided uniformly by the application layer and consumed by a wide range of descendants.

---

## Basic Usage

Inside the embedded script of a component file, write data into the component's own contexts layer through the built-in `setContext` method:

|js|ts|

```qk
<!-- Outer.qk -->
<lang-js>
    import { Inner } from "./Inner.qk"

    /**
     * @typedef {Object} Meta
     * @property {Object} contexts
     * @property {string} [contexts.theme]
     */
    setContext("theme", "dark")
</lang-js>

<Inner />
```

```qk
<!-- Outer.qk -->
<lang-ts>
    import { Inner } from "./Inner.qk"

    interface Meta {
        contexts: {
            theme?: string
        }
    }
    setContext("theme", "dark")
</lang-ts>

<Inner />
```

> [!TIP]
> The [JSDoc](https://jsdoc.app/) in the example above serves the same purpose as the `interface`: it declares types for `contexts` to provide property completion. See [TypeScript Support](docs://misc/typescript.md) for details.

Descendant components read context data through the built-in `contexts` identifier, in both scripts and templates:

```qk
<!-- Inner.qk -->
<lang-js>
    console.log(contexts.theme) // logs: dark
</lang-js>

<button !class={contexts.theme}>Theme Button</button>
```

---

## Context Inheritance

Every component has its own contexts layer whose prototype points to the parent component's contexts layer. Reading `contexts` walks up the [prototype chain](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain) and returns the nearest value:

- A key written in the component's own layer shadows the key inherited from the parent without affecting the parent's value;
- A descendant component always resolves to the first value found along the prototype chain.

Thanks to nearest-shadowing, you can write the same key in different subtrees of a component tree so that one contract presents different values in different subtrees:

```qk
<!-- Outer.qk -->
<lang-js>
    setContext("theme", "dark")
</lang-js>

<Middle />
```

```qk
<!-- Middle.qk -->
<lang-js>
    // Resolved along the prototype chain to the value written by Outer
    console.log(contexts.theme) // logs: dark

    // Writing the same key shadows Outer's value
    setContext("theme", "light")
</lang-js>

<Inner />
```

```qk
<!-- Inner.qk -->
<lang-js>
    // Resolved to the nearest value written by Middle
    console.log(contexts.theme) // logs: light
</lang-js>
```

---

## Reactive Contexts

Values written by `setContext` do not update when the data source changes, because only the value at write time is captured; later modifications to the data source are not synchronized into the context. The logic is similar to [reactive destructuring](docs://components/attributes.md#reactive-destructuring):

```js
let count = reactive(0)

// The value at write time is captured; later changes to count are not synchronized into the context
setContext("count", count)

// Descendants reading contexts.count still get 0
count = 5
```

To keep `count` in the example above reactive, you can write the context value as a `getter` function and have descendant components call it when reading the context:

```js
let count = reactive(0)
setContext("getCount", () => count)

// Descendant components call the getter when reading
contexts.getCount()
```

If you want descendant components to read the value without manually calling the `getter` function, you can use the `setContextGetter` method, which eliminates the manual call on the read side:

```js
let count = reactive(0)
setContextGetter("count", () => count)

// Descendant components read without manually calling the getter
contexts.count
```

Consistent with the other `Exp`-series APIs, the `setContextExp` method lets you write a context value in expression-shorthand form; the compiler automatically wraps the given expression as a `getter` and converts the call into a `setContextGetter` call:

```js
let count = reactive(0)
setContextExp("count", count)

// Descendant components read without manually calling the getter
contexts.count
```

---

## Default Values

The built-in `defaults` method lets you specify default values for optional context keys. When the key does not exist along the contexts chain, reads fall back to the default value:

|js|ts|

```js
/**
 * @typedef {Object} Meta
 * @property {Object} contexts
 * @property {string} [contexts.theme]
 */

defaults({
    contexts: {
        theme: "light"
    }
})
```

```ts
interface Meta {
    contexts: {
        theme?: string
    }
}

defaults({
    contexts: {
        theme: "light"
    }
})
```

> [!TIP]
> After `defaults` is called, keys that have been given default values are narrowed to non-optional in subsequent code. See [Default Value Inference](docs://misc/typescript.md#default-value-inference) for details.

---

## Using Outside Components

The [runtime package](docs://references/terminology.md#runtime-package) exports context-related APIs for external modules to operate on the contexts of a specific [component instance](docs://references/terminology.md#component-instance):

- `setContext`: writes data into the target component's contexts layer;
- `setContextGetter`: writes a reactive `getter` into the target component's contexts layer;
- `getContexts`: returns the contexts chain-head object of the target component, for example to read its contexts after obtaining a child component's instance through `&handle`.

Like [external registration of watchers and side effects](docs://basic/watchers-and-side-effects.md#external-registration), there are two main ways to bind context operations to a component instance:

1. Inside component files, `setContext` and `setContextGetter` are [built-in methods](docs://references/terminology.md#built-in-methods) already bound to the current component instance. Passing them as arguments lets the external module operate on the current component's contexts layer directly:

    |js|ts|

    ```js
    // theme.js
    export function setThemeContext(setContext, value) {
        setContext("theme", value)
    }
    ```

    ```ts
    // theme.ts
    import type { DeclareComponent, BoundSetContextFunc } from "qingkuai"

    type SetThemeContextFunc = BoundSetContextFunc<
        DeclareComponent<{
            contexts: {
                theme: string
            }
        }>
    >

    export function setLightTheme(setContext: SetThemeContextFunc) {
        setContext("theme", "light")
    }
    ```

    ```qk
    <lang-js>
        import { setLightTheme } from "./theme"

        setLightTheme(setContext)
    </lang-js>
    ```

2. Context APIs imported from the runtime package specify the target instance through their first argument; all other usage is identical to the built-in methods. Component files provide the built-in `instance` identifier, which refers to the component's own instance:

    |js|ts|

    ```js
    // theme.js
    import { getContexts } from "qingkuai"

    export function getThemeContext(instance) {
        return getContexts(instance).theme
    }
    ```

    ```ts
    // theme.ts
    import type { DeclareComponent, ComponentInstance } from "qingkuai"

    import { getContexts } from "qingkuai"

    type InstanceWithThemeContext = ComponentInstance<
        DeclareComponent<{
            contexts: {
                theme: string
            }
        }>
    >

    export function getThemeContext(instance: InstanceWithThemeContext) {
        return getContexts(instance).theme
    }
    ```

    |js|ts|

    ```qk
    <lang-js>
        import { getThemeContext } from "./theme"

        let child = null

        // Get the current component's theme context value
        getThemeContext(instance)

        // Get the child component's theme context value
        getThemeContext(child)
    </lang-js>

    <Child &handle={child} />
    ```

    ```qk
    <lang-ts>
        import type { ComponentInstance } from "qingkuai"

        import Child from "./Child.qk"

        import { getThemeContext } from "./theme"

        let child: ComponentInstance<typeof Child> | null = null

        // Get the current component's theme context value
        getThemeContext(instance)

        // Get the child component's theme context value
        getThemeContext(child)
    </lang-ts>

    <Child &handle={child} />
    ```
