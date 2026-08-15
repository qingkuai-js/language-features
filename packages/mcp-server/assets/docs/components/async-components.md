# Async Components

In modern frontend applications, on-demand loading is an important way to improve loading experience and rendering performance. Async components are a mechanism designed for exactly this purpose: they allow a component to be loaded only when it is actually needed, rather than being bundled into the main application at the initial stage. This approach not only reduces the initial bundle size effectively, but also improves resource loading speed and first-screen rendering performance. It also works naturally with routing and conditional rendering for more efficient resource management.

In Qingkuai, there are two ways to render async components:

- **Direct rendering**: use an async component directly as a component tag. It is simple and concise;
- **Directive rendering**: combined with the [async processing](docs://basic/compilation-directives.md#async-processing) directives, suitable for scenarios that need a loading state or a failure fallback.

When rendering directly, a component tag can directly bind the **result of a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that resolves to a component or of a [dynamic import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)**. The compiler hands every component tag to the runtime uniformly, which extracts the component function from the resolved Promise for rendering.

---

## Dynamic Import

Many build tools optimize modules loaded through [dynamic import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) by splitting them into separate chunks. We can take advantage of this for components as well, using the Promise returned by `import()` directly as a component tag:

```qk
<lang-js>
    import SyncPanel from "./SyncPanel.qk"

    // Manually construct a Promise that returns the imported component
    const AsyncPanel = new Promise(resolve => {
        setTimeout(() => {
            resolve(SyncPanel)
        }, 1000)
    })

    const AsyncModule = import("./AsyncModule.qk")
</lang-js>

<AsyncPanel />
<AsyncModule />
```

If you need to show a loading state or a failure fallback, combine it with the [async processing](docs://basic/compilation-directives.md#async-processing) directives:

```qk
<div #await={import("./Component.qk")}>
    Loading...
</div>
<qk:spread #then={Module}>
    <Module.default />
</qk:spread>
<div #catch>Fail to load Component.qk</div>
```

Both omitting the `default` property access (using the module directly) and destructuring the component identifier in `#then` before use are supported:

```qk
<qk:spread #then={Module}>
    <Module />
</qk:spread>
```

```qk
<qk:spread #then={{default: Component}}>
    <Component />
</qk:spread>
```

---

## Async Return

Besides using dynamic imports directly, you can also return a component from custom async logic, for example deciding which component to load based on a condition:

```qk
<lang-js>
    import Comp1 from "./Comp1.qk"
    import Comp2 from "./Comp2.qk"

    async function getComponent() {
        return (await isOk()) ? Comp1 : Comp2
    }

    const CurrentView = getComponent()
</lang-js>

<CurrentView />
```

Combined with async processing directives:

```qk
<lang-js>
    import Comp1 from "./Comp1.qk"
    import Comp2 from "./Comp2.qk"

    async function getComponent() {
        return (await isOk()) ? Comp1 : Comp2
    }
</lang-js>

<div #await={getComponent()}>Loading...</div>
<qk:spread #then={Comp}>
    <Comp />
</qk:spread>
<div #catch={err}>Error: {err}</div>
```

---

## Dynamic Switching

Assign the async component to a reactive variable declared with `let` to switch components dynamically at runtime:

```qk
<lang-js>
    let CurrentView = import("./AsyncOne.qk")

    const switchView = () => {
        CurrentView = import("./AsyncTwo.qk")
    }
</lang-js>

<CurrentView />
<button @click={switchView}>Switch</button>
```

Combined with async processing directives:

```qk
<lang-js>
    let Module = import("./AsyncOne.qk")

    const switchView = () => {
        Module = import("./AsyncTwo.qk")
    }
</lang-js>

<div #await={Module}>Loading...</div>
<qk:spread #then={View}>
    <View />
</qk:spread>
<div #catch={err}>Error: {err}</div>
<button @click={switchView}>Switch</button>
```

---

## Getting an Instance

Like a normal component tag, an async component tag also supports the `&handle` [reference attribute](docs://components/attributes.md#reference-attributes), so you can obtain the component instance and access its exported members:

```qk
<lang-js>
    import { onAfterMount } from "qingkuai"

    const AsyncView = import("./AsyncOne.qk")
    let asyncView

    onAfterMount(() => {
        console.log(asyncView) // async component instance
    })
</lang-js>

<AsyncView &handle={asyncView} />
```

Combined with async processing directives:

```qk
<lang-js>
    import { onAfterMount } from "qingkuai"

    let asyncView

    onAfterMount(() => {
        console.log(asyncView) // async component instance
    })
</lang-js>

<div #await={import("./AsyncOne.qk")}>Loading...</div>
<qk:spread #then={{default: Component}}>
    <Component &handle={asyncView} />
</qk:spread>
```
