---
description: "TypeScript support in Qingkuai - type inference for attributes, generics, slots, and events."
---

# TypeScript Support

Type inference and checking rules for component attributes, directives, lifecycle hooks, and global APIs.
`qk:spread` syntax reference: docs://misc/builtin-elements.md.

---

## Component Attribute Types

### Declaring Props and Refs

**Reserved type names:** `Props` and `Refs`

**Syntax (interface):**

```ts
interface Props {
    name: string
    list: string[]
}

interface Refs {
    input: HTMLInputElement
}
```

**Syntax (type):**

```ts
type Props = {
    name: string
    list: string[]
}

type Refs = Record<string, any>
```

**Syntax (imported):**

```ts
import type Refs from "./ref-types/Component"
import type { ComponentProps as Props } from "./types"
```

### Props Type Wrapping

**Behavior:** Language service wraps `Props` type in `Readonly` because component props cannot be modified directly.

**Example:**

```ts
interface Props {
    name: string
}

// Error: Cannot assign to 'name' because it is read-only property. ts(2540)
props.name = "..."
```

### JavaScript (JSDoc) Types

**JSDoc syntax for Props:**

```js
/**
 * @typedef {{ name: string }} Props
 */
```

**JSDoc syntax with @property:**

```js
/**
 * @typedef {Object} Props
 * @property {string} name
 */
```

### Default Type Behavior

**When types not declared:**

- **TypeScript script:** `Props` and `Refs` typed as empty object `{}`
- **JavaScript script:** No type checking (JSDoc optional)

---

## Generic Parameters

### Declaring Generics

**Syntax (Props with generics):**

```ts
type Props<T> = {
    list: T[]
}

type Refs<T> = {
    value: T
}
```

**JavaScript (JSDoc generics):**

```js
/**
 * @template T
 * @typedef {Object} Props
 * @property {T[]} list
 */
```

### Generic Type Inference

**Behavior:** Language service infers generic parameter types from component attributes.

**Example:**

```ts
// Inner.qk
interface Props<T> {
    list: T[]
}
```

```qk
<!-- Outer.qk -->
<Inner !list={["a", "b", "c"]} />
<!-- T inferred as string -->
```

### Manual Generic Arguments

**Syntax:**

```qk
<!-- list must be array of numbers -->
<Inner<number> !list={[1, 2, 3]} />

<!-- list must be array of strings -->
<Inner<string> !list={["a", "b", "c"]} />
```

### Generic External Type Import

**Constraint:** External types with generic parameters cannot be imported directly as global types (generic arguments must be provided).

**Solution (TypeScript redeclaration):**

```ts
import type { ComponentProps } from "./types"

// Option 1: Type alias
type Props = ComponentProps<string>

// Option 2: Interface extension
interface Props extends ComponentProps<string> {
    // ...
}
```

---

## Slot Context

### Automatic Type Inference

**Behavior:** Language service automatically infers slot context types from `slot` tag. Manual declaration not required.

**Example (component definition):**

```qk
<!-- DataList.qk -->
<lang-ts>
    const rows = [
        { id: 1, name: "Row 1" },
        { id: 2, name: "Row 2" }
    ]
</lang-ts>

<qk:spread #for={row of rows}>
    <slot !row>
        <!-- default content -->
    </slot>
</qk:spread>
```

**Type inference result:** Type of `row` inferred as `{ id: number, name: string }`

**Example (component usage):**

```qk
<DataList>
    <p #slot={row from "default"}>
        {row.id}: {row.name}
    </p>
</DataList>
```

**Behavior:** `row` type correctly inferred from slot definition.

---

## Event Type Inference

### Event Declaration

**Behavior:** Events accessed through built-in `props` object like other non-reference attributes. `@` and `!` prefixes interchangeable.

**Semantic marker:** `@` prefix indicates attribute is callable (semantic marker only).

### Event Typing

**Rule:** Function-type properties in `Props` inferred as event candidates.

**Syntax:**

```ts
interface Props {
    event1: () => void
    event2?: (s: string) => boolean
}
```

**Behavior:**

- `event1`: Required event handler, takes no parameters, returns void
- `event2`: Optional event handler, takes string parameter, returns boolean

**Language server behavior:**

- Typing `@` triggers attribute-name completion
- Suggested names are attributes inferred as events
- Only function-type properties offered as event candidates
