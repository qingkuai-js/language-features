# TypeScript Support

Qingkuai provides full [TypeScript](https://www.typescriptlang.org/) support. The framework itself is written in TypeScript, and compatibility with the type system is fully considered in its design. Whether you are working with component attributes, directives, lifecycle hooks, or global APIs, Qingkuai provides solid type hints and inference so that you get better auto-completion, error checking, and an overall better development experience. For projects that value type safety and maintainability, TypeScript and Qingkuai are a strong combination.

<div class="custom-block tip">
    Qingkuai is zero-intrusive with respect to TypeScript configuration. You can configure tsconfig.json just as you would in a plain TypeScript project. Projects created with <a href="https://www.npmjs.com/package/create-qingkuai">create-qingkuai</a> already include the necessary TypeScript configuration.
</div>

---

## Component Attribute Types

In component files, `Refs` and `Props` are reserved type names. Declaring these two types lets you specify types for component reference attributes and other attributes:

```ts
interface Refs {
    // ...
}

interface Props {
    // ...
}
```

You can also declare them with the `type` keyword:

```ts
type Refs = {
    // ...
}
type Props = Record<string, any>
```

Importing the types from external files is also supported:

```ts
import type Refs from "./ref-types/Component"
import type { ComponentProps as Props } from "./types"
```

At the language-service level, the `Props` type is wrapped in `Readonly`, because component props cannot be modified directly:

```ts
interface Props {
    name: string
    list: string[]
}

// Cannot assign to 'name' because it is a read-only property.ts(2540)
props.name = "..."
```

<div class="custom-block tip">
    If your embedded script language is TypeScript but you do not declare these two types, the corresponding built-in variables are typed as empty object types.
</div>

If your embedded script language is JavaScript, you can use [JSDoc](https://jsdoc.app) to add type declarations for component attributes:

```js
/**
 * @typedef {{ name: string }} Refs
 */
```

Or:

```js
/**
 * @typedef {Object} Props
 * @property {string} name
 */
```

---

## Generic Parameters

Qingkuai components support generic type parameters. You can define the generics you need directly in the `Props` or `Refs` type declarations:

```ts
type Refs<T> = {
    value: T
}

interface Props<T> {
    list: T[]
}
```

If your embedded script language is JavaScript, you can also declare generic types through JSDoc:

```js
/**
 * @template T
 * @typedef {Object} Props
 * @property {T[]} list
 */
```

Qingkuai language services infer generic parameter types from component attributes. For example, in the code below, the `list` attribute of `Inner` in `Outer.qk` is inferred as `string[]`, so `T` is inferred as `string`:

```qk
<!-- Inner.qk -->
<lang-ts>
    interface Props<T> {
        list: T[]
    }
</lang-ts>

<!-- Outer.qk -->
<Inner !list={["a", "b", "c"]} />
```

You can also specify generic arguments manually to constrain attribute types:

```qk
<!-- list must be an array of numbers -->
<Inner<number> !list={[1, 2, 3]} />

<!-- list must be an array of strings -->
<Inner<string> !list={["a", "b", "c"]} />
```

When an external type includes generic parameters, you cannot import it directly as a global type declaration, because generic arguments must be provided when using that type. This is consistent with standard TypeScript restrictions. In this case, redeclare the global type in the component file and pass the required generic arguments, for example:

```ts
import type { ComponentProps } from "./types"

type Props = ComponentProps<string>

// Or
interface Props extends ComponentProps<string> {
    // ...
}
```

---

## Slot Context

In component files, you do not need to declare slot context types manually. Qingkuai language services infer slot context types automatically from the `slot` tag:

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

When using the component above, the type of `row` is correctly inferred as `{ id: number, name: string }`:

```qk
<DataList>
    <p #slot={row from "default"}>
        {row.id}: {row.name}
    </p>
</DataList>
```

---

## Event Type Inference

In Qingkuai components, events are accessed through the built-in `props` object just like other non-reference attributes. In other words, on component tags, the `@` and `!` prefixes before an attribute name can be used interchangeably. The `@` prefix mainly serves as a semantic marker to indicate that the attribute is callable. When you add an attribute to a component, typing `@` triggers attribute-name completion, and the suggested names are exactly the attributes inferred as events. As long as a property in the component's `Props` type has a function type, the Qingkuai language server treats it as an event candidate and offers it in attribute completion after `@` is typed. In the following code, both properties in `Props` are inferred as events:

```ts
interface Props {
    event1: () => void
    event2?: (s: string) => boolean
}
```
