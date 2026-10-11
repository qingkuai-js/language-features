# Optimization

When building modern web applications, performance is always one of the main concerns for developers. Whether it is initial loading speed, the efficiency of reactive updates, or component rendering granularity, the right optimization techniques lead to a smoother user experience. By reducing unnecessary dependency tracking, rendering on demand, delaying updates, and operating on raw values, you can lower overhead effectively and improve overall runtime efficiency, keeping the application responsive even when it has complex features.

---

## Signal Mode

By default, identifiers inferred as reactive have [deep reactivity](docs://basic/reactivity.md#reactivity-mode): reading a property recursively wraps nested values in reactive proxies, and mutations at any level can trigger updates. This provides an intuitive development experience, but the reactivity system itself carries non-negligible runtime overhead. If your application demands the highest runtime performance, you can combine two [runtime configuration](docs://misc/config-files.md#runtime-configuration) options to minimize the performance impact of reactivity:

```json
{
    "reactivityMode": "shallow",
    "allowConstReactive": false
}
```

The two options complement each other: [`allowConstReactive: false`](docs://misc/config-files.md#allowconstreactive) takes all immutable bindings out of [reactivity inference](docs://references/reactivity-infer-rules.md), eliminating the overhead of dependency collection and proxy wrapping, while [`reactivityMode: "shallow"`](docs://misc/config-files.md#reactivitymode) retains only [shallow reactivity](docs://basic/reactivity.md#reactivity-mode) for mutable state, so property reads return the raw values themselves.

When used together, only `let`/`var` top-level identifiers that are "accessed in the template and mutated in the script" are inferred as reactive, and they only maintain shallow reactivity — all other identifiers are raw values with no extra overhead. The application then enters a `signal`-like reactive mode, very similar to how frameworks such as [Solid](https://www.solidjs.com) and [Preact Signals](https://preactjs.com/guide/v10/signals/) work: each piece of reactive state is a mutable top-level binding, and reassigning it precisely triggers updates to the parts that depend on it. There are no deep proxies and no recursive dependency tracking, so the performance impact of reactivity is very low. As a consequence, reactive updates can only be triggered by assigning to the identifier itself:

```qk
<lang-js>
    let user = {
        stars: 0,
        name: "Qingkuai"
    }

    // Triggers an update
    function addStar() {
        user = {
            ...user,
            stars: user.stars + 1
        }
    }

    // Just a plain JS operation, does not trigger an update
    function addStarSilently() {
        user.stars++
    }
</lang-js>

<p>{ user.name }: { user.stars }</p>
<button @click={addStar}>add star</button>
<button @click={addStarSilently}>add star silently</button>
```

> [!TIP]
> In framework performance comparisons such as [js-framework-benchmark](https://github.com/krausest/js-framework-benchmark), the results for each framework usually come from versions carefully optimized by the framework authors or core contributors — often requiring deliberate consideration of the reactivity markers used for every single state update. In Qingkuai, however, the two lines of configuration above are all you need to achieve near-ultimate runtime performance without carefully optimizing every reactivity marker.

---

## Tree Shaking

Projects created with [create-qingkuai](https://www.npmjs.com/package/create-qingkuai) use [Vite](https://vite.dev) as the default build and bundling tool, and Vite is based on [Rollup](https://rollupjs.org) under the hood. This gives it excellent [Tree-shaking](https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking) capabilities, thanks to the static import nature of [import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import).

Qingkuai was designed with Tree-shaking in mind from the beginning. All APIs and even directives support Tree-shaking. For example, if you do not use the `#for` directive in your code, the related code is not bundled into the final output. Other directives and features follow the same principle, preventing unused code from entering the bundle and further improving build performance and output size.

```qk
<!-- Except for the #if directive, the runtime code of other directives will not be bundled into the final output -->
<div #if={visible}>...</div>
```

For better Tree-shaking results, it is recommended to use versions in ESM (ES Module) format when importing third-party libraries whenever possible. Compared with CommonJS, ESM supports static analysis, allowing build tools to accurately identify and remove unused module code and reduce bundle size. For example, if a library provides both CommonJS and ESM builds, prefer the ESM one — this import approach significantly improves the leanness and execution performance of the final build output:

```js
// Recommended: ESM module, Tree-shaking friendly, smaller bundle size
import { debounce } from "lodash-es"

// Not recommended: CommonJS module, cannot be tree-shaken reliably and may pull in the whole lodash package
import { debounce } from "lodash"
```

> [!TIP]
> When choosing third-party libraries, besides whether the functionality meets your needs, also consider their impact on bundle size after being introduced. Large libraries can significantly increase the first-load time of pages, especially on mobile devices. You can use tools such as [bundlejs](https://bundlejs.com) to evaluate a library — it intuitively shows the actual size after importing a package or a specific export. With this information, you can make more cost-effective choices between functionality and size, for example by using lighter alternative libraries, or importing only the required modules.

---

## Style Reuse

When the same shared stylesheet is repeatedly imported into the scoped embedded style blocks of multiple components through `src` or `@import`, the compilation output typically generates multiple copies of equivalent style rules (each with a different component's scope marker attached). This increases CSS size and amplifies style parsing overhead.

```qk
<!-- A.qk -->
<lang-css src="./common.css" />

<!-- B.qk -->
<lang-css>
    @import "./common.css";
</lang-css>
```

In the example above, `common.css` is scoped independently once in each component: the same original rule is attached with different components' scope markers and multiple copies are generated. As the number of components grows, such duplicate rules accumulate linearly, directly driving up CSS size and browser style-matching overhead. For shared styles reused across components, prefer the following practices:

- Load stable shared styles in a unified way from a global style entry (such as the app entry CSS or the global styles of layout components).
- For styles that do need to be declared within a component but do not rely on scope isolation, maintain them centrally in a `global` style block or a global file.
- Keep only rules that are strongly coupled to the component's structure and must rely on scope isolation in the component's scoped styles.

---

## Code Splitting

Code-splitting is an important technique for frontend performance optimization. It breaks an application into multiple modules that are loaded on demand, speeding up first-screen loading and reducing wasted resources. Build tools such as Vite and Rollup automatically split modules through static dependency analysis and [dynamic import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import), and they also support manual chunking strategies such as separating third-party libraries for better loading efficiency and browser cache utilization:

```js
// module.js and its dependencies are split into a separate file,
// and the module is loaded only when loadModule is called
function loadModule() {
    return import("./module.js")
}
```

In applications with multiple routes, you should not bundle all route components into the main application. Instead, rely on code-splitting to lazy-load route components so that loading efficiency and user experience are improved significantly. This is exactly the core purpose of the [async components](docs://components/async-components.md) introduced earlier:

```qk
<lang-js>
    const ComponentModule = import("./Component.qk")
</lang-js>

<qk:spread
    #await={ComponentModule}
    #then={{ default: Component }}
>
    <Component />
</qk:spread>
```

---
