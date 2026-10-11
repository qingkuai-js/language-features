---
description: "Qingkuai optimization: Signal Mode (reactivityMode: shallow + allowConstReactive: false), directive-level tree shaking, shared-style reuse rules to avoid duplicated scoped CSS, and code splitting with async components."
keywords: ["optimization", "signal mode", "reactivityMode", "allowConstReactive", "tree shaking", "code splitting", "style reuse", "bundle size", "优化"]
---

# Optimization

Lower runtime and payload overhead through Signal Mode configuration, tree shaking, style reuse discipline, and code splitting.

## Rules

1. **Signal Mode**: when the user cares about runtime performance, combine `"reactivityMode": "shallow"` with `"allowConstReactive": false` in `.qingkuairc`: `const` bindings leave reactivity inference and are treated as raw values, mutable identifiers keep only shallow reactivity, and the application enters a `signal`-like mode — no deep proxies, no recursive dependency tracking; reactive updates are triggered only by reassigning the identifier itself (mutating a nested property is a plain JS operation), and deep structures are updated by whole-value replacement. For the few modules that need deep reactivity, place a local config file restoring the default mode in their directory, add a `reactive` attribute to the script tag, or explicitly mark a `let` declaration with `reactive`.
2. **Tree shaking**: every API and directive is tree-shakable — unused directive runtimes (e.g. `#for` when only `#if` is used) never enter the bundle. Prefer ESM versions of third-party libraries for reliable static analysis and shaking (e.g. `lodash-es` over `lodash`); oversized libraries noticeably increase first-load time (especially on mobile), so evaluate bundle impact with tools like bundlejs.
3. **Style reuse**: importing the same shared stylesheet into scoped style blocks of multiple components (`src` or `@import`) compiles to one scoped copy per component with different scope markers — duplicates grow linearly with component count, driving up CSS size and browser style-matching overhead. Instead:
   - Load stable shared styles in a unified way from a global style entry (e.g. app entry CSS or the global styles of layout components).
   - Keep styles that do need to be declared within a component but rely on no scope isolation in a `global` style block or a global file.
   - Keep only rules strongly coupled to the component's structure and dependent on scope isolation in scoped component styles.
4. **Code splitting**: Vite/Rollup split modules automatically based on static dependency analysis and dynamic imports, and also support manual chunking strategies (e.g. separating third-party libraries); use dynamic `import()` for on-demand modules and lazy-load route components with async components instead of bundling all routes into the main application.

## Examples

How updates are triggered in Signal Mode:

```json
{
    "reactivityMode": "shallow",
    "allowConstReactive": false
}
```

```qk
<lang-js>
    let user = {
        stars: 0,
        name: "Qingkuai"
    }

    // Triggers an update
    function addStar() {
        user = { ...user, stars: user.stars + 1 }
    }

    // Just a plain JS operation, does not trigger an update
    function addStarSilently() {
        user.stars++
    }
</lang-js>
```

Only `#if` runtime code is bundled here:

```qk
<!-- Except for the #if directive, the runtime code of other directives will not be bundled into the final output -->
<lang-js>
    let visible = true
</lang-js>

<div #if={visible}>...</div>
```

Lazy-loading a route component:

```qk
<qk:spread
    #await={import("./Component.qk")}
    #then={{ default: Component }}
>
    <Component />
</qk:spread>
```

## See also

- [Reactivity](docs://agent/basic/reactivity.md)
- [Configuration Files](docs://agent/misc/config-files.md)
- [Async Components](docs://agent/components/async-components.md)
- [Component Stylesheets](docs://agent/components/stylesheets.md)
