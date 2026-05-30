---
description: ""
---

# Optimization

When building modern web applications, performance is always one of the main concerns. Whether it is initial loading speed, the efficiency of reactive updates, or component rendering granularity, the right optimization techniques lead to a smoother user experience. By reducing unnecessary dependency collection, rendering on demand, delaying updates, and operating on raw values, you can lower overhead effectively and improve overall runtime efficiency, keeping the application responsive even when it has complex features.

---

## Tree Shaking

Projects created with [create-qingkuai](https://www.npmjs.com/package/create-qingkuai) use [Vite](https://vite.dev) as the default build tool, and Vite is based on [Rollup](https://rollupjs.org) under the hood. This gives it strong [Tree-shaking](https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking) capabilities, thanks to the static import nature of [import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import).

Qingkuai was designed with Tree-shaking in mind from the beginning. All APIs and even directives support Tree-shaking. For example, if you do not use the `#for` directive in your code, the related runtime code is not included in the final output. Other directives and features follow the same principle, preventing unused code from entering the bundle and further improving build performance and output size.

```qk
<!-- Except for the #if directive, the runtime code of other directives will not be bundled into the final output -->
<div #if={visible}>...</div>
```

For better Tree-shaking results, it is recommended to prefer ESM versions of third-party libraries when possible. Compared with CommonJS, ESM supports static analysis, allowing build tools to identify and remove unused code accurately and reduce bundle size. For example, if a library provides both CommonJS and ESM builds, prefer the ESM one:

```js
// Recommended: ESM module, Tree-shaking friendly, smaller bundle size
import { debounce } from "lodash-es"

// Not recommended: CommonJS module, cannot be tree-shaken reliably and may pull in the whole lodash package
import { debounce } from "lodash"
```

<div class="custom-block tip">
    When choosing third-party libraries, do not focus only on whether the functionality meets your needs. Also consider their effect on bundle size. Large libraries can significantly increase first-load time, especially on mobile devices. Tools such as <a href="https://bundlejs.com">bundlejs</a> can help evaluate the actual size impact of importing a package or a specific export, making it easier to choose lighter alternatives or import only the modules you really need.
</div>

---

## Code Splitting

Code-splitting is an important frontend optimization technique. It breaks an application into multiple modules that are loaded on demand, speeding up first-screen loading and reducing wasted resources. Build tools such as Vite and Rollup automatically split modules through static dependency analysis and [dynamic import](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import), and they also support manual chunking strategies such as separating third-party libraries for better loading efficiency and cache usage:

```js
// module.js and its dependencies are split into a separate file,
// and the module is loaded only when loadModule is called
function loadModule() {
    return import("./module.js")
}
```

In applications with multiple routes, you should not bundle all route components into the main application. Instead, rely on code-splitting to lazy-load route components so that loading efficiency and user experience are improved significantly. This is exactly the core use case of the [async components](docs://components/async-components.md) introduced earlier:

```qk
<qk:spread
    #await={import("./Component.qk")}
    #then={{ default: Component }}
>
    <Component />
</qk:spread>
```

---
