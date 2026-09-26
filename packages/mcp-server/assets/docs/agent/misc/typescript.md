---
description: "Qingkuai TypeScript support: the Meta component contract, generics on Meta, defaults narrowing, slot/event inference, and runtime utility types (ComponentInstance, ComponentProps, ...)."
keywords: ["typescript", "Meta", "generic", "utility types", "ComponentInstance", "类型"]
---

# TypeScript Support

Qingkuai provides full TypeScript support with zero tsconfig intrusion. The reserved type name `Meta` declares a component's contract; utility types from the runtime package describe components from outside.

## Syntax

| Utility type | Meaning |
|---|---|
| `ComponentInstance<C>` | Component instance type; includes every exported member (e.g. `child.exportedValue`) |
| `ComponentProps<C>` | Extracts the `props` contract of `Meta` — for wrapper/HOC components |
| `ComponentRefs<C>` | Extracts the `refs` contract — reference-attribute types |
| `ComponentSlots<C>` | Extracts the slots a component accepts plus their passed-context types |
| `ComponentContexts<C>` | Extracts the `contexts` contract — for runtime contexts operations |
| `ComponentExports<C>` | Extracts the exported-members type mounted on the instance |
| `DeclareComponent<{...}>` | Declares a contract manually (wrapper components, type-level stubs) producing the same type compiled components carry |
| `BoundLifecycleFunc` | Type of built-in lifecycle methods (instance-bound, no instance argument) |
| `BoundEffectFunc` / `BoundWatchFunc` | Types of built-in watcher/side-effect methods for external-module parameters |
| `BoundSetContextFunc<C>` / `BoundSetContextGetterFunc<C>` | Bound forms of built-in `setContext`/`setContextGetter`; generic over a component contract type |

## Rules

1. `Meta` members — `props`, `refs`, `contexts` — are all optional; undeclared members become empty object types. The language service wraps `props` and `contexts` in `Readonly` (writes are illegal); `refs` stays writable.
2. Declare `Meta` as `interface Meta {...}`, `type Meta = {...}`, or in JS via JSDoc `@typedef {Object} Meta` with `@property` lines. Importing it from an external file is supported (`import type { Meta } from "./types"`, aliased imports allowed).
3. Component files cannot export types; shared contracts (incl. `Meta`) live in external `.ts` files.
4. `Meta` is the only place generic parameters may be declared in a component file (`interface Meta<T extends string | number>`); the language server infers `T` from component attributes, and explicit arguments constrain them: `<Inner<number> !list={[1, 2, 3]} />`. An imported `Meta` cannot carry generics — import a generic contract type and wrap it: `type Meta<T extends string> = GenericMeta<T>`.
5. `defaults({ props: {...}, refs: {...}, contexts: {...} })` accepts only the properties declared as optional in each `Meta` member; keys in `props` and `refs` that are given defaults narrow to non-optional (required) afterward.
6. Slot context types are inferred automatically from the `slot` tag — no declarations needed.
7. Event inference: any function-typed property in the `props` member is an event candidate; typing `@` on a component tag completes exactly those names. `@` and `!` are interchangeable before component attribute names — `@` marks callability semantically.

## Examples

Component contract with generics, inferred from attributes:

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
<!-- Outer.qk: T inferred as string -->
<lang-ts>
    import Inner from "./Inner.qk"
</lang-ts>

<Inner !list={["a", "b", "c"]} />

<!-- Explicit generic argument -->
<Inner<number> !list={[1, 2, 3]} />
```

Instance and contract extraction (plain ts):

```ts
import type { ComponentInstance, ComponentProps } from "qingkuai"

import Child from "./Child.qk"

let child: ComponentInstance<typeof Child> | null = null
type ChildProps = ComponentProps<typeof Child>
```

Manual contract declaration (plain ts):

```ts
import type { DeclareComponent } from "qingkuai"

type Dialog = DeclareComponent<{
    props: { title: string }
    exports: { open: () => void }
}>
```

## See also

- [Member Exports](docs://agent/components/exports.md)
- [Component Attributes](docs://agent/components/attributes.md)
- [Component Contexts](docs://agent/components/contexts.md)
