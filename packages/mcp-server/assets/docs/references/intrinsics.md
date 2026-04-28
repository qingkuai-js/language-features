---
description: "Compiler intrinsics - reserved identifiers for component state, attributes, slots, and built-in methods."
---

# Compiler Intrinsics

Compiler intrinsics are reserved identifiers recognized and handled directly by the compiler. They access component attributes, reference attributes, slot state, and call built-in methods.

## State Access

### props

**Syntax:**

```ts
const value = props.attributeName
```

**Usage:** Read normal attributes and event attributes passed from parent component.

**Behavior:**

- Enables parent-to-child communication
- Props are read-only (wrapped in `Readonly` by TypeScript language service)
- Access pattern: `props.attributeName`

**Reference:** [docs://components/attributes.md](docs://components/attributes.md)

---

### refs

**Syntax:**

```ts
refs.refName = value
const value = refs.refName
```

**Usage:** Access and modify reference attributes inside a component.

**Behavior:**

- Enables two-way binding with parent
- Supports direct updates
- Accesses reference data passed by parent

**Reference:** [docs://basic/reference-attributes.md](docs://basic/reference-attributes.md), [docs://components/attributes.md#reference-attributes](docs://components/attributes.md#reference-attributes)

---

### slots

**Syntax:**

```ts
if (slots.slotName) {
    // slot content provided
}
```

**Usage:** Determine whether slot content has been passed into component.

**Behavior:**

- Boolean check for slot presence
- Allows conditional rendering based on slot availability

**Reference:** [docs://components/slots.md](docs://components/slots.md)

---

## Reactivity Markers

### reactive

**Syntax:**

```ts
const state = reactive(initialValue)
```

**Usage:** Explicitly mark identifier as deeply reactive.

**Behavior (by declaration):**

- `let`/`var`: identifier and all nested properties are reactive
- `const`: only properties are recursively reactive (identifier cannot be reassigned)

**Degeneration rule:** Ignored when both conditions met:

- Declared with `const`
- Initial value is literal type (numeric literal, string literal)

```ts
const a = reactive(1) // degenerates -> raw value
const b = reactive("") // degenerates -> raw value
const c = reactive({}) // inferred normally
```

**Reference:** [docs://basic/reactivity.md#reactivity-declaration](docs://basic/reactivity.md#reactivity-declaration), [docs://references/reactivity-infer-rules.md](docs://references/reactivity-infer-rules.md)

---

### shallow

**Syntax:**

```ts
const state = shallow(initialValue)
```

**Usage:** Explicitly mark identifier as shallow reactive.

**Behavior (by declaration):**

- `let`/`var`: only identifier itself is reactive; properties do not participate in inference
- `const`: only first-level properties are reactive; deeper properties are not

**Reference:** [docs://basic/reactivity.md#reactive-depth](docs://basic/reactivity.md#reactive-depth), [docs://references/reactivity-infer-rules.md](docs://references/reactivity-infer-rules.md)

---

### raw

**Syntax:**

```ts
const value = raw(initialValue)
```

**Usage:** Explicitly mark identifier as static (non-reactive).

**Behavior:**

- No reactive behavior applied
- Modifications do not trigger page updates
- No dependency collection

**Reference:** [docs://references/reactivity-infer-rules.md](docs://references/reactivity-infer-rules.md)

---

## Derived State

### alias

**Syntax:**

```ts
const simplified = alias(props.complex.nested.value)
```

**Usage:** Create alias for identifier; simplify complex access while preserving reactivity.

**Rules:**

- Must be created explicitly through `alias` method
- Independent of `reactive`/`shallow`/`raw` marking flow
- Preserves reactivity of original identifier

**Reference:** [docs://basic/reactivity.md#reactive-aliases](docs://basic/reactivity.md#reactive-aliases), [docs://components/attributes.md#destructure-built-in-objects](docs://components/attributes.md#destructure-built-in-objects)

---

### derived

**Syntax:**

```ts
const computed = derived(() => expression)
```

**Usage:** Create derived reactive state from existing reactive state.

**Behavior:**

- Automatically tracks dependencies
- Updates when dependencies change
- Executes callback to compute value

**Reference:** [docs://basic/reactivity.md#derived-reactive-state](docs://basic/reactivity.md#derived-reactive-state)

---

### derivedExp

**Syntax:**

```ts
const result = derivedExp(expression)
```

**Usage:** Shorthand for derived reactive state.

**Behavior:**

- Pass expression directly (no callback wrapper)
- Compiler converts to standard `derived` declaration
- Equivalent to `derived(() => expression)`

**Example:**

```ts
const fullName = derivedExp(firstName + " " + lastName)
```

**Reference:** [docs://basic/reactivity.md#derived-reactive-state](docs://basic/reactivity.md#derived-reactive-state)

---

## Watcher Shortcuts

### watchExp, preWatchExp, postWatchExp, syncWatchExp

**Syntax:**

```ts
watchExp(expression) // default watcher
preWatchExp(expression) // pre-watcher
postWatchExp(expression) // post-watcher
syncWatchExp(expression) // synchronous watcher
```

**Usage:** Shorthand registration for watchers by passing expression directly.

**Behavior:**

- Compiler converts to standard `watch`/`preWatch`/`postWatch`/`syncWatch` registration
- Automatically infers dependencies from expression
- Alternative to callback-based declaration

**Reference:** [docs://basic/watchers-and-side-effects.md#watchers](docs://basic/watchers-and-side-effects.md#watchers), [docs://basic/watchers-and-side-effects.md#convenience-registration](docs://basic/watchers-and-side-effects.md#convenience-registration)

---

## Defaults

### defaultProps

**Syntax:**

```ts
defaultProps({
    attributeName: defaultValue
    // ...
})
```

**Usage:** Define default values for component attributes.

**Scope:** Normal attributes and event attributes.

**Behavior:**

- Applied when parent does not pass attribute
- Specifies defaults for both value and event attributes

**Reference:** [docs://components/attributes.md](docs://components/attributes.md)

---

### defaultRefs

**Syntax:**

```ts
defaultRefs({
    refName: defaultValue
    // ...
})
```

**Usage:** Define default values for component reference attributes.

**Scope:** Reference attributes only.

**Behavior:**

- Applied when parent does not pass reference
- Specifies defaults for reference bindings

**Reference:** [docs://components/attributes.md#reference-attributes](docs://components/attributes.md#reference-attributes)
