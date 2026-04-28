---
description: "On-demand component loading via dynamic import and async functions."
---

# Scope

Async component rendering patterns based on `#await` / `#then` / `#catch`.

# Dynamic Import

```qk
<qk:spread
    #await={import("./Component.qk")}
    #then={{ default: Component }}
>
    <Component />
</qk:spread>
```

With loading and error states:

```qk
<div #await={import("./Component.qk")}>
    Loading...
</div>
<qk:spread #then={{ default: Component }}>
    <Component />
</qk:spread>
<div #catch>
    Failed to load Component.qk
</div>
```

# Async Return

```qk
<lang-js>
    import Comp1 from "./Comp1.qk"
    import Comp2 from "./Comp2.qk"

    async function getComponent() {
        return (await isOk()) ? Comp1 : Comp2
    }
</lang-js>

<div #await={getComponent()} #then={CompModule}>
    <CompModule.default />
</div>
```

# Implementation

Async components use docs://basic/compilation-directives.md#async-processing directives.
`qk:spread` syntax reference: docs://misc/builtin-elements.md.

Behavior: No extra compiler/runtime configuration is required.

# Benefits

- Enables code-splitting by deferring component module loading.
- Reduces initial payload for routes/features not immediately rendered.
- Makes loading/error states explicit and composable through directives.

# Rules

- `#await` branch handles pending state.
- `#then` branch receives resolved module/value context.
- `#catch` branch handles rejected state.
- Dynamic import usage requires rendering through resolved component symbol (for example `Component` or `CompModule.default`).
