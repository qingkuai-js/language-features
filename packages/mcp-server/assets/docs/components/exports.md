# Member Exports

In component-based development, the export mechanism determines which capabilities a component exposes externally and how those capabilities should be consumed. A well-designed export interface improves reusability and maintainability, while also constraining internal implementation details to avoid unnecessary coupling. In this section, you will learn the export rules and common practices in Qingkuai component files, helping you strike a balance between encapsulation and external usability.

---

## Definition and Usage

Inside the embedded script block of a component file, you can use `export` statements just like in regular JS/TS modules to export variables, functions, classes, and more:

```qk
<lang-js>
    export function exportedFunction() {
        console.log("This function is exported")
    }

    export const exportedValue = "This value is exported"
</lang-js>
```

After compiler processing, a component file becomes a default-exported function, and `export` statements are attached to the component instance. Therefore, when accessing exported members from a component, you cannot use an `import` statement as you would with regular module members. Instead, you need to access them through the component instance:

|js|ts|

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

```qk
<lang-js>
    import type { ComponentInstance } from "qingkuai"

    import Child from "./Child.qk"

    let child: ComponentInstance<typeof Child> | null = null

    onAfterMount(() => {
        console.log(child.exportedValue) // logs: This value is exported
        child.exportedFunction() // logs: This function is exported
    })
</lang-js>

<Child &handle={child} />
```

---

## Syntax Limitations

Because exports in component files are attached to the component instance, export statements in component files have certain limitations. Only `export declarations` and `export lists` are supported:

```qk
<lang-js>
    // Export declaration is supported
    export const someValue = "This value is exported"

    // Export list is supported
    const someFunction = () => {
        console.log("This function is exported")
    }
    export { someFunction }
</lang-js>
```

Other forms of export statements are not supported, including `default exports`, `re-exports`, and `export =`:

```qk
<lang-ts>
    // Default export is not supported
    export default function defaultExportedFunction() {}

    // Re-export is not supported
    export { someFunction } from "./someModule"
</lang-ts>
```

Exports in component files are attached to the component instance, while types do not exist at runtime. Therefore, component files are not allowed to export any types:

```qk
<lang-ts>
    type SomeTypeAlias = {}

    export { SomeTypeAlias }

    export type SomeType = {}

    export interface SomeInterface {}

    export type { ExternalType } from "./types"
</lang-ts>
```

If you need to share types across components (for example, the component contract type `Meta`), the recommended approach is to define these types in an external `.ts` file and import them in each component:

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

> [!TIP]
> Once a component imports the `Meta` type, it is already bound to that type — no extra steps are needed. See [TypeScript Support](docs://misc/typescript.md) for details.
