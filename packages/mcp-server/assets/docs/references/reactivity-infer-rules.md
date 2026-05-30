---
description: ""
---

# Reactivity Inference Rules

In Qingkuai, the compiler uses a set of inference rules to determine the reactivity type of each identifier automatically. Understanding these rules helps developers manage state more precisely and override default behavior when necessary through explicit markers.

---

## Inference Flow

For each identifier in the top-level scope of a script block, the compiler performs reactivity inference in the following order:

1. **Check explicit markers**: if a variable declaration calls `reactive`, `shallow`, or `raw` in its initializer, that explicit marker takes priority.
2. **Apply implicit rules**: if no explicit marker is used, inference is based on how the identifier is used in the template and how it is declared.

---

## Explicit Markers

Built-in reactivity markers must be called in the initializer of a variable declaration. When an identifier uses one of these built-in methods as an explicit marker, the compiler infers the corresponding reactivity type with priority:

```qk
<lang-ts>
    const config = raw([1, 2, 3])               // raw value
    const list = shallow({ debug: false })      // shallow reactive
    const user = reactive({ name: "Qingkuai" }) // deeply reactive
</lang-ts>
```

### Degeneration

Even when an explicit marker is used, the identifier degenerates into a raw value and the marker is ignored if both of the following conditions are met:

- It is declared with `const`
- Its initial value is a literal type, such as a numeric literal or string literal

```qk
<lang-ts>
    const a = shallow(1)    // degenerates into a raw value; shallow is ignored
    const b = reactive("")  // degenerates into a raw value; reactive is ignored
    const c = reactive({})  // inferred normally; final reactivity depends on later usage
</lang-ts>
```

If degeneration does not occur, the identifier is inferred as the reactivity type specified by the explicit marker.

---

## Aliases and Derived Values

- Alias bindings can only be created explicitly through the `alias` built-in method.
- Derived reactive values can only be created and explicitly marked through `derived`, `derivedExp`, or their shorthand declaration forms.

These rules are independent of the explicit marking flow for `reactive`, `shallow`, and `raw`:

```qk
<lang-ts>
    const firstName = reactive("Qing")
    const lastName = reactive("kuai")

    const userName = alias(props.userInfo.name)

    const fullName = derived(() => firstName + " " + lastName)
    const shortName = derivedExp(firstName + "-" + lastName)

</lang-ts>
```

---

## Implicit Inference

When an identifier does not use any explicit marker, the compiler applies the following implicit rules.

### Not Used in the Template

If an identifier is not accessed in the template, the compiler infers it as a raw value. Such identifiers exist only in script logic and do not participate in dependency collection and update scheduling.

```qk
<lang-ts>
    let count = 0     // never used in the template -> raw value
    let message = ""  // never used in the template -> raw value
</lang-ts>

<p> count and message are not accessed here </p>
```

### Used in the Template

If an identifier is accessed in the template and is declared with `let` or `var` with a literal initial value, the compiler also checks whether it is modified anywhere in the script:

- **Not modified**: inferred as a raw value to avoid unnecessary dependency collection and update overhead
- **Modified**: inferred as the reactivity type corresponding to the current reactivity mode

```qk
<lang-ts>
    let a = 1    // used in the template, but never modified -> raw value
    let b = 0    // used in the template and modified -> type depends on the current reactivity mode
    function increment() {
        b++
    }
</lang-ts>

<p>{ a }</p>
<button @click={increment}>{ b }</button>
```

### Reference Attributes

For mutable identifiers declared with `let` or `var`, when they are used by reference attributes (such as `&value` and `&dom`), the compiler treats those identifiers as having a reachable mutation path. Even if there is no explicit assignment, increment, or other mutation statement in the script, they are still inferred as reactive.

```qk
<lang-ts>
    let inputValue = "Initial value"
</lang-ts>

<input type="text" &value={inputValue} />
```

### Other Declaration Forms

For non-variable declarations such as `class` declarations, `function` declarations, and TypeScript `enum` declarations, the compiler treats them as mutable declarations during implicit inference.

- These declarations cannot be explicitly marked with `reactive`, `shallow`, or `raw`.
- If used in the template, they participate in inference according to the current reactivity mode; otherwise, they are treated as raw values.

---

## Inference Hints

If the Qingkuai [VS Code extension](docs://misc/language-features.md#ide-extensions) is installed, hovering over an identifier in top-level scope shows the reactivity type inferred by the compiler in the language server tooltip:

<img src="/static/medias/inferred-raw-never-mutated.png" alt="inferred-raw-never-mutated.png" style="width:60%; margin-left:20%;"  />
<img src="/static/medias/inferred-reactive.png" alt="inferred-reactive.png" style="width:60%; margin-left:20%;" />
<img src="/static/medias/inferred-alias.png" alt="inferred-alias.png" style="width:60%; margin-left:20%;" />
<img src="/static/medias/inferred-derived.png" alt="inferred-derived.png" style="width:60%; margin-left:20%;" />
<img src="/static/medias/inferred-downgraded.png" alt="inferred-downgraded.png" style="width:60%; margin-left:20%;" />
