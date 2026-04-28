---
description: "Compiler reactivity inference rules - determines reactivity type of identifiers in script blocks."
---

# Reactivity Inference Rules

The compiler automatically determines reactivity type for each identifier in top-level script scope. Understanding these rules enables precise state management and explicit overrides when needed.

## Inference Flow

For each top-level identifier, the compiler performs inference in order:

1. **Check explicit markers** (priority 1): If variable declaration calls `reactive()`, `shallow()`, or `raw()` in initializer, that marker takes priority.
2. **Apply implicit rules** (priority 2): If no explicit marker, inference is based on template usage and declaration form.

---

## Explicit Markers

### reactive() Marker

**Syntax:**

```ts
const config = reactive({ debug: false })
let user = reactive({ name: "Qingkuai" })
```

**Behavior by declaration:**

- `let`/`var`: Identifier and all nested properties are deeply reactive
- `const`: Only properties are recursively reactive (identifier cannot be reassigned)

**Degeneration (when ignored):**

```ts
const a = reactive(1) // IGNORED -> raw value (const + literal)
const b = reactive("") // IGNORED -> raw value (const + literal)
const c = reactive({}) // APPLIED (object is not literal type)
```

Degeneration occurs when **both** conditions met:

- Declaration: `const`
- Initial value: literal type (numeric literal, string literal)

---

### shallow() Marker

**Syntax:**

```ts
const config = shallow({ debug: false })
let flags = shallow({ a: true })
```

**Behavior by declaration:**

- `let`/`var`: Only identifier itself is reactive; properties do NOT participate in inference
- `const`: Only first-level properties are reactive; deeper properties are not

---

### raw() Marker

**Syntax:**

```ts
const config = raw([1, 2, 3])
```

**Behavior:**

- Identifier marked as static value
- No reactive behavior
- Modifications do not trigger updates
- No dependency collection

---

### Aliases and Derived Values (Independent)

**Syntax:**

```ts
const firstName = reactive("Qing")
const lastName = reactive("kuai")

const userName = alias(props.userInfo.name)
const fullName = derived(() => firstName + " " + lastName)
const shortName = derivedExp(firstName + "-" + lastName)
```

**Rules:**

- Alias bindings created **only** through `alias()` built-in method
- Derived reactive values created **only** through `derived()`, `derivedExp()`, or shorthand forms
- These rules are **independent** of `reactive`/`shallow`/`raw` explicit marking flow

**Reference:** [docs://basic/reactivity.md#reactive-aliases](docs://basic/reactivity.md#reactive-aliases), [docs://basic/reactivity.md#derived-reactive-state](docs://basic/reactivity.md#derived-reactive-state)

---

## Implicit Inference

### Not Used in Template

**Rule:** Identifier not accessed in template → **inferred as raw value**

**Behavior:**

- Exists only in script logic
- Does not participate in dependency collection
- Does not trigger update scheduling

**Example:**

```ts
let count = 0 // not in template → raw value
let message = "" // not in template → raw value
// (never accessed in template)
```

---

### Used in Template with let/var + Literal

**Rule:** Identifier declared with `let`/`var` + literal value + accessed in template → check modifications

**Sub-rules:**

- **Not modified anywhere:** inferred as **raw value** (avoids unnecessary overhead)
- **Modified in script:** inferred as reactivity type corresponding to current reactivity mode

**Example:**

```ts
let a = 1 // used in template, never modified → raw value
let b = 0 // used in template, modified → depends on current reactivity mode

function increment() {
    b++ // modified
}
```

**Template:**

```qk
<p>{ a }</p>
<button @click={increment}>{ b }</button>
```

---

### Other Declaration Forms

**Scope:** `class`, `function`, TypeScript `enum` declarations.

**Rules:**

- Cannot be explicitly marked with `reactive()`, `shallow()`, `raw()`
- Treated as mutable declarations during implicit inference
- **Not used in template:** treated as raw values
- **Used in template:** participate in inference according to current reactivity mode

---

## Inference Hints

**IDE Support:** VS Code extension shows inferred reactivity type in language server tooltip when hovering over top-level identifiers.

**Hover indicators:**

- Raw value indicator
- Reactive indicator
- Alias indicator

**Setup:** Install Qingkuai [VS Code extension](docs://misc/language-features.md#ide-extensions)
