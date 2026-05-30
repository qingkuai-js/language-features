---
description: ""
---

# Async Components

In modern frontend applications, on-demand loading is an important way to improve loading experience and rendering performance. Async components are a mechanism designed for exactly this purpose: they allow a component to be loaded only when it is actually needed, rather than being bundled into the main application at the initial stage. This approach not only reduces the initial bundle size effectively, but also improves resource loading speed and first-screen rendering performance. It also works naturally with routing and conditional rendering for more efficient resource management. In Qingkuai, async components are implemented by combining directives related to [async processing](docs://basic/compilation-directives.md#async-processing), with no special configuration required.

---

## Dynamic Import

Many build tools optimize modules loaded through [dynamic import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) by splitting them into separate chunks. The same approach can be used for components:

```qk
<qk:spread
    #await={import("./Component.qk")}
    #then={{default: Component}}
>
    <Component />
</qk:spread>
```

You can also add a loading state and template content for the failure case:

```qk
<div #await={import("./Component.qk")}>
    Loading...
</div>
<qk:spread #then={{default: Component}}>
    <Component />
</qk:spread>
<div #catch>Fail to load Component.qk</div>
```

---

## Async Return

You can also return a component from custom async logic:

```qk
<lang-js>
    import Comp1 from "./Comp1.qk"
    import Comp2 from "./Comp2.qk"

    async function getComponent() {
        return (await isOk()) ? Comp1 : Comp2
    }
</lang-js>

<div
    class="comp-box"
    #await={getComponent()}
    #then={ObtainedComponentModule}
>
    <ObtainedComponentModule.default />
</div>
```
