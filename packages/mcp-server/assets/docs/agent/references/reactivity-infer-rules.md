---
description: "Ordered rules the Qingkuai compiler uses to infer each top-level identifier's reactivity type: explicit markers, degeneration conditions, and implicit template-usage-based inference."
keywords: ["reactivity inference", "inference rules", "raw", "reactive", "const", "推导规则", "响应性"]
---

# Reactivity Inference Rules

For each identifier in the top-level scope of a script block, the compiler infers its reactivity type by performing the following steps in order: check explicit markers first, then apply implicit rules.

## Rules

1. **Explicit markers**: if a variable declaration calls `reactive`, `shallow`, or `raw` in its initializer, that explicit marker takes priority and determines the reactivity type. Markers must be called in the initializer of a variable declaration.
2. **Degeneration** (checked even when an explicit marker is used): the identifier degenerates into a raw value and the marker is ignored if BOTH conditions hold — it is declared with `const`, and its initial value is a literal type (such as a numeric literal or string literal). If degeneration does not occur, the identifier is inferred as the reactivity type specified by the marker.
3. **Aliases and derived values** (independent of the explicit marking flow): alias bindings can only be created explicitly through the `alias` built-in method; derived reactive values can only be created and explicitly marked through the `derived` or `derivedExp` built-in methods.
4. **Implicit inference** (no explicit marker), based on template usage and declaration form:
   1. Not accessed in the template: inferred as a raw value. Such identifiers exist only in script logic and do not participate in dependency collection and the update flow. Identifiers wrapped with `raw` as a non-reactive read in interpolations and embedded script expressions are not counted as accessed even when they appear in the template.
   2. Accessed in the template: the compiler checks whether the identifier is modified in the script. This check applies to identifiers declared with `let` or `var` whose initial value is a literal type, identifiers declared by `class` and `function` declarations, as well as mutable identifiers in `shallow` mode whose initial value is a non-literal expression.
      - Not modified: inferred as a raw value to avoid unnecessary dependency collection and update overhead.
      - Modified: inferred as the reactivity type corresponding to the current reactivity mode.
      - Access propagation: when a derived value is accessed in the template, identifiers read inside its `derived` getter or `derivedExp` expression literal are also counted as accessed in the template and participate in inference under the same modified-check above (the script must still contain a modification).
   3. Used by reference attributes (such as `&value` and `&handle`): mutable identifiers declared with `let` or `var` are treated as having a reachable mutation path and are inferred as reactive, even without an explicit assignment, increment, or other mutation statement in the script.
   4. Other declaration forms: non-variable declarations such as `class` declarations, `function` declarations, and TypeScript `enum` declarations cannot be explicitly marked with `reactive`, `shallow`, or `raw`; their reactivity is decided entirely by implicit inference. `class`/`function` declarations go through the same modified-check as `let`/`var` declarations with literal initial values — they are inferred as reactive only when the name is assigned in the script (or used by a reference attribute) and accessed in the template; `enum` declarations compile to mutable bindings initialized through assignment, always count as modified, and are directly inferred as the corresponding reactivity type per the current reactivity mode when accessed in the template.
5. **`allowConstReactive` option** (default `true`): when set to `false` — during implicit inference, constants declared with `const` are not inferred as reactive and are uniformly treated as raw values; during explicit marking, using `reactive` or `shallow` to mark a constant declaration whose initial value is not a literal expression is disallowed and raises compile error 1070.

## Constraints

- Explicit markers are only valid in variable-declaration initializers; `class`, `function`, and TypeScript `enum` declarations cannot be explicitly marked with `reactive`, `shallow`, or `raw`.
- Degeneration requires both conditions simultaneously (`const` + literal-type initial value); `const c = reactive({})` does not degenerate — its final reactivity depends on later usage.
- The template-usage modified-check does not cover every identifier: it applies to `let`/`var` declarations whose initial value is a literal type, `class`/`function` declarations, and mutable identifiers in `shallow` mode whose initial value is a non-literal expression.
- Alias and derived values cannot be produced by the `reactive`/`shallow`/`raw` marking flow; they have dedicated creation forms only.

## Examples

Explicit markers, with degeneration on `const` + literal initializers:

```qk
<lang-ts>
    const a = shallow(1) // degenerates into a raw value; shallow is ignored
    const b = reactive("") // degenerates into a raw value; reactive is ignored
    const config = raw([1, 2, 3]) // raw value
    const list = shallow({ debug: false }) // shallow reactive
    const user = reactive({ name: "Qingkuai" }) // deeply reactive
</lang-ts>

<p>{list.debug} {user.name} {config.length}</p>
```

Implicit inference in `shallow` mode — only identifiers modified in the script become reactive:

```qk
<lang-js shallow>
    let count = 0
    let state = load() // never assigned → stays a raw variable
    function load() {
        return "ready"
    }
    function setCount(v) {
        count = v // assignment exists in the source → count is inferred as shallow
    }
</lang-js>

<p>{ state }</p>
<button @click={setCount}>{ count }</button>
```

Reference attributes make the identifier reactive without any script mutation:

```qk
<lang-ts>
    let inputValue = "Initial value"
</lang-ts>

<input type="text" &value={inputValue} />
```

Access propagation of derived sources — when the derived value is accessed in the template, identifiers read inside its `derived` getter or `derivedExp` expression literal participate in inference as if accessed in the template (the script must still contain a modification):

```qk
<lang-js>
    let count = 0
    function setCount(v) {
        count = v
    }
    const double = derivedExp(count * 2)
</lang-js>

<button @click={setCount}>{ double }</button>
```

## See also

- [Reactivity](docs://agent/basic/reactivity.md)
