---
description: "Passing data, events, and writable references into Qingkuai components through component tag attributes."
keywords: ["component attributes", "props", "attrs", "inherit", "组件属性", "传参"]
---

# Component Attributes

Attributes on component tags pass external data or configuration into a component. Ordinary attributes are read inside the component through the built-in `props` identifier (its properties are read-only getters); writable reference attributes are read through the built-in `refs` identifier.

## Syntax

| Form | Parent tag syntax | Child-side access | Value / type |
|---|---|---|---|
| Static attribute | `msg="value"` | `props.msg` | string |
| Boolean attribute (no value) | `isOk` | `props.isOk` | boolean `true` |
| Dynamic attribute (shorthand) | `!list` | `props.list` | any type; reactive |
| Dynamic attribute (bound) | `!time={article.time}` | `props.time` | any type; reactive |
| Event attribute | `@someThingHappened={console.log($arg)}` | `props.someThingHappened` | function; `$arg` is the argument at trigger time |
| Reference attribute | `&name={name}` | `refs.name` (read and write) | any type; writes sync back to the parent's data |
| Component instance reference | `&handle={child}` | `child` | component instance |
| Default values | child-side `defaults({ refs: {...}, props: {...} })` | — | fallback when the parent omits the attribute |

Attribute names support both camelCase and kebab-case: `<Component myAttr />` and `<Component my-attr />` are equivalent and resolve to the same prop. `props`/`refs` types are declared with a `Meta` typedef (JSDoc) or `interface Meta` in `<lang-ts>`.

## Rules

1. All attributes except reference attributes — including events — are accessed inside the component through the built-in `props` identifier.
2. Static attributes pass strings only; dynamic attributes (the `!` prefix) support more data types (arrays, objects, functions, ...). When the data source changes, DOM inside the component that uses the attribute is updated.
3. When an attribute name is written without a value, the component internally receives the boolean `true`.
4. Event attributes differ from other non-reference attributes only semantically; we recommend naming callback functions passed into components as events and marking them with the `@` prefix. The language server suggests only function-typed attributes as events.
5. `props` properties are essentially read-only getters; writes require a reference attribute (`&name={name}`), read through the built-in `refs`. Assigning to a `refs` property synchronizes the change back to the external data and triggers its reactive updates.
6. Destructuring `props`/`refs` calls the getter once and produces independent plain variables that lose the connection to the passed value: primitive identifiers may be inferred as having independent reactivity (local views update, external views do not); when the attribute value is a reactive complex type, property access stays reactive, but reassigning the identifier behaves like primitive types — it only updates the local view and does not sync back to the outside. For reactive destructuring, always pair it with the built-in `alias`: `let { name } = alias(refs)`, `const { userInfo } = alias(props)` — alias identifiers compile to access expressions on the original properties, with no runtime wrapper overhead.
7. Built-in `defaults({ refs: {...}, props: {...} })` declares fallback values for attributes the parent did not pass; after the call, defaulted keys are narrowed to non-optional.
8. `myAttr` and `my-attr` are both accepted on component tags. Formatting rewrites kebab-case component attribute and event names to camelCase by default; a `.prettierrc` containing `{"qingkuai": {"componentAttributeFormatPreference": "kebab"}}` switches the preference (completion suggestions follow it).

## Constraints

- `props` properties cannot be modified directly (read-only getters) — use reference attributes for writes.
- Mutating the internals of a complex `props` value (e.g. `props.userInfo.name = "..."`) is technically possible but not recommended; it makes component state harder to track and maintain.
- `&handle` on a component tag is reserved for receiving the component instance — never name a reference attribute `handle`.
- When a component is destroyed, reference attributes automatically reset the bound variable to `null`, preventing dangling references.
- Attribute inheritance (fallthrough of undeclared attributes onto the root element) is not defined in this documentation; do not assume it exists.

## Examples

### Static, boolean, dynamic, and event attributes

```qk
<!-- Inner.qk -->
<lang-js>
    /**
     * @typedef {Object} Meta
     * @property {Object} props
     * @property {string} props.msg
     * @property {boolean} [props.isOk]
     * @property {string[]} props.list
     * @property {(msg: string) => void} props.someThingHappened
     */
</lang-js>

<p>{props.msg} — {props.isOk}</p>
<p>The length of list is: {props.list.length}</p>
```

```qk
<!-- Outer.qk -->
<lang-js>
    import Inner from "./Inner.qk"

    const list = ["js", "ts", "qk"]
</lang-js>

<Inner
    msg="value"
    isOk
    !list
    @someThingHappened={console.log($arg)}
/>
```

### Reference attribute

```qk
<!-- Inner.qk -->
<lang-js>
    /**
     * @typedef {Object} Meta
     * @property {Object} refs
     * @property {string} refs.name
     */
</lang-js>

<p>Inner name: {refs.name}</p>
<button @click={refs.name = "Qingkuai"}>Change the name</button>
```

```qk
<!-- Outer.qk -->
<lang-js>
    import Inner from "./Inner.qk"

    let name = "JavaScript"
</lang-js>

<p>Outer name: {name}</p>
<Inner &name={name} />
```

### Default values

```qk
<!-- Inner.qk -->
<lang-js>
    /**
     * @typedef {Object} Meta
     * @property {Object} props
     * @property {number} [props.age]
     * @property {string} [props.name]
     */
    defaults({
        props: {
            age: 0,
            name: "Unknown"
        }
    })
</lang-js>

<p>{props.name}: {props.age}</p>
```

```qk
<!-- Outer.qk -->
<lang-js>
    import Inner from "./Inner.qk"
</lang-js>

<!-- Neither attribute passed; both fall back to defaults -->
<Inner />
```

## See also

- [Slots](docs://agent/components/slots.md)
- [Intrinsic Identifiers](docs://agent/references/intrinsics.md)
- [Event Handling](docs://agent/basic/event-handling.md)
