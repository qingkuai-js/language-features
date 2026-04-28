---
description: "Component attributes: static, dynamic, events, references, destructuring, defaults, and naming."
---

# Scope

Component attributes for passing data, events, and references between parent and child components.

# Accessing Attributes

Inside component, use built-in `props` identifier for attributes.

# Static Attributes

```qk
<!-- Outer.qk -->
<Inner attr="value" />

<!-- Inner.qk -->
<lang-js>
    console.log(props.attr)  // "value"
</lang-js>
```

Boolean shorthand (no value → `true`):

```qk
<Inner attr />
<!-- props.attr = true -->
```

# Dynamic Attributes

```qk
<!-- Outer.qk -->
<lang-js>
    const list = ["js", "ts", "qk"]
</lang-js>
<Inner !list />

<!-- Inner.qk -->
<p>Length: {props.list.length}</p>
```

Dynamic attributes can pass: booleans, objects, arrays, etc. (not just strings).

Reactivity: Updates when data source changes.

# Events

```qk
<!-- Outer.qk -->
<Inner @eventName={callback} />

<!-- Inner.qk -->
<lang-js>
    setTimeout(() => {
        props.eventName(data)  // trigger event
    }, 1000)
</lang-js>
```

Rule: Event attributes use `@` prefix to mark callable action handlers.

# Reference Attributes

```qk
<!-- Outer.qk -->
<lang-js>
    let name = "JavaScript"
</lang-js>
<Inner &attr={name} />

<!-- Inner.qk -->
<p>refs.attr: {refs.attr}</p>
<button @click={refs.attr = "Qingkuai"}>Change</button>
```

Access external references via built-in `refs` identifier. Modifications sync back to parent.

Constraint: Direct modification of `props` values not recommended (harder to track).

# Attribute Destructuring

```js
const { str } = props // NOT reactive (no getter invocation)
```

## Preserving Reactivity

```js
import { alias } from "qingkuai"

const { str } = alias(props) // reactive, equivalent to props.str
let { str } = alias(refs) // reactive for both read and write
```

# Default Values

```js
defaultProps({
    age: 0,
    name: "Unknown",
    description: "Default info"
})

defaultRefs({
    checked: false
})
```

Used when parent doesn't pass specific attributes.

# Attribute Name Format

Both formats supported:

```qk
<Component myAttr />
<Component my-attr />
```

## Format Preferences

Add `.prettierrc`:

```json
{
    "qingkuai": {
        "componentAttributeFormatPreference": "kebab"
    }
}
```

Default: camelCase formatting.

# TypeScript Support

For type hints and completion, read docs://misc/typescript.md.
