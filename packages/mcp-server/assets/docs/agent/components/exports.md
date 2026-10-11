---
description: "Qingkuai member exports: supported export statement forms, consumption through the component instance via &handle, and prohibited export forms."
keywords: ["export", "member exports", "component instance", "handle", "导出"]
---

# Member Exports

`export` statements inside a component file attach exported members to the component instance — a component file compiles to a default-exported function, so exports are consumed through the instance, not through `import`.

## Syntax

| Form | Supported | Consumption |
|---|---|---|
| Export declaration | `export const someValue = "..."` / `export function f() {}` | Via instance member: `child.someValue` |
| Export list | `export { someFunction }` | Via instance member: `child.someFunction()` |
| Default export | ✗ Not supported | — |
| Re-export (`export { x } from "..."`) | ✗ Not supported | — |
| `export =` | ✗ Not supported | — |
| Type exports (`export type`/`export interface`/exporting types in lists) | ✗ Not allowed — types do not exist at runtime | Share types via an external `.ts` file imported by each component |

## Rules

1. Exported members are accessed through the component instance obtained with `&handle` (e.g. `<Child &handle={child} />`), then `child.exportedValue` / `child.exportedFunction()` — typically inside `onAfterMount`.
2. To share types across components (e.g. the `Meta` contract type), define them in an external `.ts` file and `import type` them in each component; importing `Meta` binds the component to that type automatically.
3. Only `export declarations` and `export lists` are valid inside component files.

## Examples

Exporting members:

```qk
<lang-js>
    export function exportedFunction() {
        console.log("This function is exported")
    }

    export const exportedValue = "This value is exported"
</lang-js>
```

Consuming through the instance:

```qk
<lang-js>
    import Child from "./Child.qk"

    let child = null

    onAfterMount(() => {
        console.log(child.exportedValue) // logs: This value is exported
        child.exportedFunction() // logs: This function is exported
    })
</lang-js>

<Child &handle={child} />
```

Sharing the `Meta` contract type externally:

```ts
// types.ts
export interface Meta {
    props: {
        title: string
    }
}
```

```qk
<lang-ts>
    import type { Meta } from "./types"
</lang-ts>
```

## Constraints

- Never use `import` to consume component exports; they are instance members.
- Do not add `export default`, re-exports, or type exports to a component file — all are compile errors.

## See also

- [Component Basics](docs://agent/components/basic.md)
- [TypeScript Support](docs://agent/misc/typescript.md)
- [Component Attributes](docs://agent/components/attributes.md)
