# Reactivity Inference Rules

In Qingkuai, the compiler automatically determines the reactivity type of each identifier based on a set of inference rules. Understanding these rules helps developers manage state better and override default behavior through explicit markers when necessary.

---

## Inference Flow

The compiler performs reactivity inference for each identifier in the top-level scope of a script block in the following order:

1. **Check explicit markers**: if a variable declaration calls `reactive`, `shallow`, or `raw` in its initial value, inference follows the explicit marker with priority;
2. **Apply implicit rules**: if no explicit marker is used, the identifier is implicitly inferred based on whether it is accessed in the template and its declaration form.

---

## Explicit Markers

Built-in reactivity marker methods must be called in the initial value part of a variable declaration. When an identifier is explicitly marked with one of the above built-in methods, the compiler infers it as the corresponding reactivity type with priority:

```js
const config = raw([1, 2, 3]) // raw value
const list = shallow({ debug: false }) // shallow reactive
const user = reactive({ name: "Qingkuai" }) // deeply reactive
```

### Degenerate Behavior

Even when an explicit marker is used, if a declaration meets both of the following conditions, the identifier **degenerates into a raw value** and the explicit marker will be ignored by the compiler:

- It is declared with `const`
- Its initial value is a literal type (such as a numeric literal, a string literal, etc.)

```js
// degenerates into a raw value; shallow is ignored
const a = shallow(1)

// degenerates into a raw value; reactive is ignored
const b = reactive("")

// inferred normally; its reactivity type is determined by later usage
const c = reactive({})
```

If degeneration does not occur, the identifier is inferred as the reactivity type specified by the explicit marker.

---

## Aliases and Derived Values

- Alias bindings can only be created explicitly through the `alias` built-in method.
- Derived reactive values can only be explicitly marked and created through the `derived` or `derivedExp` built-in methods.

These rules are independent of the explicit marking flow for `reactive`, `shallow`, and `raw`:

```js
const firstName = reactive("Qing")
const lastName = reactive("kuai")

const userName = alias(props.userInfo.name)

const fullName = derived(() => firstName + " " + lastName)
const shortName = derivedExp(firstName + "-" + lastName)
```

---

## Implicit Inference

When an identifier does not use any explicit marker, the compiler first splits paths by whether it is accessed in the template, then combines the declaration form and modifications in the script to reach the inference result.

### Not Accessed in the Template

When an identifier is not accessed in the template, the compiler infers it as a raw value. Such identifiers exist only in script logic and do not participate in dependency collection and the update flow.

```qk
<lang-ts>
    // never accessed in the template → raw value
    let count = 0

    // never accessed in the template → raw value
    let message = ""
</lang-ts>

<p> count and message are not accessed here </p>
```

Note that not every identifier that appears in the template counts as accessed: in template interpolations and embedded script expressions, identifiers wrapped with the built-in method `raw` as a [non-reactive read](docs://basic/reactivity.md#non-reactive-reads) are not considered accessed in the template.

```qk
<lang-ts>
    let user = {
        name: "Qingkuai"
    }

    // no valid reactive access in the template → raw value
    let config = load()
</lang-ts>

<p>{user.name + raw(config).label}</p>
<p>{user.name + raw(config.label)}</p>
```

### Accessed in the Template

When an identifier is accessed in the template, the compiler checks whether it is modified in the script. This check applies to identifiers declared with `let` or `var` whose initial value is a literal type, identifiers declared by `class` and `function` declarations, as well as mutable identifiers in `shallow` mode whose initial value is a non-literal expression:

- **Not modified**: inferred as a raw value, avoiding unnecessary dependency collection and update overhead
- **Modified**: inferred as the reactivity type corresponding to the current reactivity mode

```qk
<lang-js shallow>
    let count = 0

    // never assigned → not reactive
    let state = load()

    function setCount(v) {
        // assignment exists in the source → count is inferred as shallow
        count = v
    }
</lang-js>

<p>{ state }</p>
<button @click={setCount}>{ count }</button>
```

The modified-check is not limited to explicit assignments, increments, or other mutation statements in the script; there are two special rules:

1. For mutable identifiers declared with `let` or `var`, when they are used by a reference attribute (such as `&value`, `&handle`), the compiler treats the identifier as having a reachable mutation path; even if there is no mutation statement in the script, it is still inferred as reactive:

    ```qk
    <lang-ts>
        let inputValue = "Initial value"
    </lang-ts>

    <input type="text" &value={inputValue} />
    ```

2. For non-variable declarations such as `class` declarations, `function` declarations, and TypeScript `enum` declarations: these declarations cannot use explicit markers, and their reactivity is decided entirely by implicit inference. Among them, `class` and `function` declarations follow the same modified-check as `let`/`var` declarations with literal initial values: they are inferred as reactive only when the name is assigned in the script (or used by a reference attribute) and accessed in the template; an `enum` declaration compiles to a mutable binding initialized through assignment, and the compiler treats it as always modified: when accessed in the template, it is directly inferred as the corresponding reactivity type per the current reactivity mode:

    ```qk
    <lang-ts>
        class User {
            name = "Qingkuai"
        }

        function getUser() {
            return new User()
        }

        enum Status {
            Active,
            Inactive
        }

        function reload() {
            // the name is assigned → satisfies the modified-check
            getUser = () => new User()
        }
    </lang-ts>

    <!-- assigned + accessed in the template → inferred as reactive -->
    <p>{ getUser().name }</p>

    <!-- enum is always treated as modified → inferred as reactive -->
    <p>{ Status.Active }</p>
    ```

### Access Propagation of Derived Sources

When a derived reactive value is accessed in the template, identifiers read inside its `derived` getter or `derivedExp` expression literal are also counted as accessed in the template and participate in inference under the rules of the previous section (the script must still contain a modification):

```qk
<lang-js>
    let count = 0

    function setCount(v) {
        // modification exists → count is inferred as reactive
        count = v
    }

    const double = derivedExp(count * 2)
</lang-js>

<button @click={setCount}>{ double }</button>
```

---

## The allowConstReactive Option

The [`allowConstReactive`](docs://misc/config-files.md#allowconstreactive) runtime configuration option controls whether constant declarations participate in reactivity inference. Its default value is `true`. When this option is set to `false`:

- During implicit inference, constants declared with `const` are not inferred as reactive and are uniformly treated as raw values;
- During explicit marking, using `reactive` or `shallow` to mark a constant declaration whose initial value is a non-literal expression is disallowed and raises a compile error:

```js
const list = shallow(getList()) // compile error: 1070
const config = reactive(loadConfig()) // compile error: 1070
```

---

## Inference Hints

If the Qingkuai [VS Code extension](docs://misc/language-features.md#ide-extensions) is installed, identifiers in the top-level scope of embedded scripts show inlay hints of the reactivity status inferred by the compiler:

<img src="/static/medias/inferred-inlay-hint.png" alt="inferred-inlay-hint.png" style="width:60%; margin-left:20%;"  />

> [!TIP]
> You can enable or disable this hint by modifying the `inlayHintReactiveStatus` setting in the VS Code extension.

When hovering the mouse pointer over an identifier in the top-level scope, the language server also shows the reactivity type inferred by the compiler in the tooltip:

<img src="/static/medias/inferred-reactive.png" alt="inferred-reactive.png" style="width:60%; margin-left:20%;" />
<img src="/static/medias/inferred-raw-never-mutated.png" alt="inferred-raw-never-mutated.png" style="width:60%; margin-left:20%;"  />
<img src="/static/medias/inferred-alias.png" alt="inferred-alias.png" style="width:60%; margin-left:20%;" />
<img src="/static/medias/inferred-derived.png" alt="inferred-derived.png" style="width:60%; margin-left:20%;" />
<img src="/static/medias/inferred-downgraded.png" alt="inferred-downgraded.png" style="width:60%; margin-left:20%;" />

> [!TIP]
> You can enable or disable this hint by modifying the `hoverHintReactiveStatus` setting in the VS Code extension.
