# TypeScript Support

Qingkuai provides full [TypeScript](https://www.typescriptlang.org/) support. The framework itself is written in TypeScript, and compatibility with the type system is fully considered in its design. Whether you are working with component contracts, directives, lifecycle methods, or global APIs, Qingkuai provides comprehensive type hints and inference so that you get better auto-completion, error detection, and an overall better development experience. For projects that value type safety and maintainability, TypeScript and Qingkuai are an ideal pair.

> [!TIP]
> Qingkuai is zero-intrusive with respect to TypeScript configuration. You can freely configure tsconfig.json just as you would in a plain TypeScript project. Projects created with [create-qingkuai](https://www.npmjs.com/package/create-qingkuai) already include the necessary TypeScript configuration options.

---

## Component Contract Types

In component files, `Meta` is a reserved type name used to declare the component's contract type. The members of `Meta` describe each of the data layers the component exposes to the outside:

```ts
interface Meta {
    props: {
        // ...
    }
    refs: {
        // ...
    }
    contexts: {
        // ...
    }
}
```

Declaring it as a type alias with the `type` keyword also works:

```ts
type Meta = {
    props: {
        // ...
    }
}
```

> [!TIP]
> All three members are optional; any member that is not declared is treated as an empty object type. For example, when only the `props` member is declared, the `refs` and `contexts` built-in identifiers are typed as empty object types.

At the language-service level, the `props` and `contexts` members are wrapped in `Readonly`, because component attributes and contexts cannot be modified directly inside the component, while the `refs` member remains writable:

```ts
interface Meta {
    props: {
        name: string
        list: string[]
    }
}

// Cannot assign to 'name' because it is a read-only property.ts(2540)
props.name = "..."
```

If your embedded script language is JavaScript, you can declare the component contract type through [JSDoc](https://jsdoc.app):

```js
/**
 * @typedef {Object} Meta
 * @property {Object} props
 * @property {string} props.name
 *
 * @property {Object} refs
 * @property {boolean} refs.checked
 */
```

Or:

```js
/**
 * @typedef {Object} Meta
 * @property {{ name: string }} props
 * @property {{ checked: boolean }} refs
 */
```

Importing `Meta` from an external file is also supported:

```ts
import type { Meta } from "./types"
```

Or:

```ts
import type { SpecificMeta as Meta } from "./types"
```

> [!TIP]
> Component files are not allowed to export types. Shared contract types should be placed in external `.ts` files and imported by each component from there. See [Member Exports](docs://components/exports.md) for details.

---

## Generic Parameters

Qingkuai components support generic type parameters. Simply add the generic parameters you need to the `Meta` type declaration — `Meta` is also the only place in a component file where generic parameters may be declared:

```ts
interface Meta<T extends string | number> {
    refs: {
        value: T
    }
    props: {
        list: T[]
        onChange: (item: T) => void
    }
}
```

The corresponding `JSDoc` form is as follows:

```js
/**
 * @template {string | number} T
 * @typedef {Object} Meta
 * @property {Object} [refs]
 * @property {T} refs.value
 *
 * @property {Object} props
 * @property {T[]} props.list
 * @property {(item: T) => void} props.onChange
 */
```

The Qingkuai language server infers generic parameter types from component attributes. For example, in the example below, the `list` attribute of `Inner` in `Outer.qk` is inferred as `string[]`, so `T` is inferred as `string`:

```qk
<!-- Inner.qk -->
<lang-ts>
    interface Meta<T extends string | number> {
        props: {
            list: T[]
        }
    }
</lang-ts>
```

```qk
<!-- Outer.qk -->
<Inner !list={["a", "b", "c"]} />
```

Of course, you can also specify generic arguments manually to constrain attribute types:

```qk
<!-- list must be an array of numbers -->
<Inner<number> !list={[1, 2, 3]} />

<!-- list must be an array of strings -->
<Inner<string> !list={["a", "b", "c"]} />
```

A `Meta` imported from an external file cannot carry generic parameters. If you need a reusable generic contract, define a contract type with generic parameters in an external file first, then import it inside the component and wrap it as `Meta`:

```ts
// types.ts
export interface GenericMeta<T extends string | number> {
    props: {
        list: T[]
    }
}
```

```qk
<lang-ts>
    import type { GenericMeta } from "./types"

    type Meta<T extends string> = GenericMeta<T>;
</lang-ts>
```

---

## Default Value Inference

In a component file, using the built-in `defaults` method lets you set default values for optional component attributes while narrowing the types of `props`, `refs`, and `contexts`.

```ts
interface Meta {
    props: {
        name?: string
        age?: number
        fixed: string
    }
    refs: {
        checked?: boolean
    }
    contexts: {
        theme?: string
    }
}
```

The argument type of `defaults` is the properties declared as optional in each member of the `Meta` type:
<img src="/static/medias/defaults-hover.png" alt="defaults-hover.png" style="width: 80%; margin-left: 10%;" />

After calling `defaults`, the properties of `props` and `refs` that received a default value are narrowed to non-optional (required) types in the code that follows, which matches the runtime behavior:
<img src="/static/medias/defaults-type-narrowing.png" alt="defaults-type-narrowing.png" style="width: 80%; margin-left: 10%;" />

---

## Slot Contexts

In component files, you do not need to care about slot type declarations. The Qingkuai language service automatically infers slot context types from the `slot` tag:

```qk
<!-- DataList.qk -->
<lang-ts>
    const rows = [
        {
            id: 1,
            name: "Row 1"
        },
        {
            id: 2,
            name: "Row 2"
        }
    ]
</lang-ts>

<qk:spread #for={row of rows}>
    <slot !row>
        <!-- default content -->
    </slot>
</qk:spread>
```

When importing and using the component above, the type of `row` is automatically inferred:
<img src="/static/medias/inferred-slot-context.png" alt="inferred-slot-context.png" style="width: 80%; margin-left: 10%;" />

---

## Event Type Inference Mechanism

In Qingkuai components, events are accessed through the built-in `props` object just like other non-reference attributes. In other words, on component tags, the `@` and `!` prefixes before an attribute name can be used interchangeably. The `@` prefix mainly serves as a semantic marker to indicate that the attribute is a callable method. When you add an attribute to a component, typing `@` triggers attribute-name completion, and the suggested names are exactly the attributes inferred as events. As long as a property in the `props` member of the component's `Meta` type has a function type, the Qingkuai language service marks it as an event candidate and offers the corresponding attribute-name completion when you type `@`. In the following code, both properties in the `props` member are inferred as events:

```ts
interface Meta {
    props: {
        event1: () => void
        event2?: (s: string) => boolean
    }
}
```

---

## Utility Types

The runtime package exports a set of utility types built around component contracts, used to describe and destructure a component's type information outside the component, or to manually declare contracts for wrapper components.

### ComponentInstance

The component instance type. The compiled output of a component file is a default-exported component function, and the instance type is composed of the component's exported members together with the instance's built-in properties:

```ts
import type { ComponentInstance } from "qingkuai"

import Child from "./Child.qk"

let child: ComponentInstance<typeof Child> | null = null
```

The instance type includes every member the component exports, so accessing exported members such as `child.exportedValue` comes with full type hints.

### ComponentProps

Extracts the **props contract** of a component, i.e. the type of the `props` member in the component contract type `Meta`. Typical use case: reading a component's [attributes](docs://components/attributes.md) types when writing wrapper components or higher-order component utilities:

```ts
import type { ComponentProps } from "qingkuai"

import Child from "./Child.qk"

type ChildProps = ComponentProps<typeof Child>
```

### ComponentRefs

Extracts the **refs contract** of a component, i.e. the type of the `refs` member in `Meta`. Typical use case: reading the types of the [reference attributes](docs://components/attributes.md#reference-attributes) a component exposes in debugging tools or wrapper components:

```ts
import type { ComponentRefs } from "qingkuai"

import Form from "./Form.qk"

type FormRefs = ComponentRefs<typeof Form>
```

### ComponentSlots

Extracts the **slots contract** of a component, i.e. the [slots](docs://components/slots.md) it accepts along with the types of the [contexts they pass](docs://components/slots.md#passing-context):

```ts
import type { ComponentSlots } from "qingkuai"

import Layout from "./Layout.qk"

type LayoutSlots = ComponentSlots<typeof Layout>
```

### ComponentContexts

Extracts the **contexts contract** of a component, i.e. the type of the `contexts` member in `Meta`. Useful for typing [contexts](docs://components/contexts.md) operations in the [runtime](docs://components/contexts.md#using-outside-components):

```ts
import type { ComponentContexts } from "qingkuai"

import ThemePanel from "./ThemePanel.qk"

type ThemePanelContexts = ComponentContexts<typeof ThemePanel>
```

### ComponentExports

Extracts the **exported members type** of a component. Members exported by a component are mounted on the component instance, and the exported part of the instance type is composed of exactly this type:

```ts
import type { ComponentExports } from "qingkuai"

import Counter from "./Counter.qk"

type CounterExports = ComponentExports<typeof Counter>
```

### DeclareComponent

Declares a component contract, producing the same component type that compiled components carry. Useful for wrapper components, module parameters typed as components, type-level stubs, and other scenarios where type inference from a component file is unavailable:

```ts
import type { DeclareComponent } from "qingkuai"

type Dialog = DeclareComponent<{
    props: { title: string }
    exports: { open: () => void }
}>
```

### BoundLifecycleFunc

The type of the built-in [lifecycle](docs://components/lifecycle.md) methods of component files. Since these methods are bound by the compiler to the current component instance, calls no longer take an instance argument; when an external module needs to accept these built-in methods as parameters, use the corresponding type annotation:

```ts
import type { BoundLifecycleFunc } from "qingkuai"

// External module: accepts the component's built-in lifecycle method as an argument
export function registerDestroyHook(onBeforeDestroy: BoundLifecycleFunc) {
    onBeforeDestroy(() => {
        // release external resources
    })
}
```

### BoundEffectFunc / BoundWatchFunc

The types of the built-in [watchers and side effects](docs://basic/watchers-and-side-effects.md) methods of component files. Since these methods are bound by the compiler to the current component instance, calls no longer take an instance argument; when an external module needs to accept these built-in methods as parameters, use the corresponding type annotations:

```ts
import type { BoundEffectFunc } from "qingkuai"

// External module: accepts the component's built-in effect method as an argument
export function collectEffects(effect: BoundEffectFunc) {
    effect(() => {
        // ...
    })
}
```

### BoundSetContextFunc / BoundSetContextGetterFunc

The "bound" forms of the built-in `setContext` and `setContextGetter` methods of components. Each accepts a component contract type as its generic parameter and returns a function type bound to the current component instance. External modules can use them to accept the components' built-in context-setting methods:

```ts
import type ThemePanel from "./ThemePanel.qk"
import type { BoundSetContextFunc } from "qingkuai"

// External module: accepts the component's built-in setContext method as an argument
export function provideTheme(
    setContext: BoundSetContextFunc<typeof ThemePanel>
) {
    setContext("theme", "dark")
}
```
