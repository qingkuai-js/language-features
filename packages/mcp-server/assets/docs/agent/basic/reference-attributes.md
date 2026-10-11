---
description: "Qingkuai reference attributes pass variable references through &-prefixed attributes (&handle for DOM elements, &value/&number/&checked/&group for form state) via setter invocations."
keywords: ["reference attributes", "&value", "&checked", "&handle", "refs", "two-way binding", "引用属性", "双向绑定"]
---

# Reference Attributes

## Syntax

A reference attribute prefixes an attribute name with `&` (e.g. `&value`) to pass a variable reference, so the attribute value can be read and written directly from outside.

| Attribute | Applies to | Receives |
| --- | --- | --- |
| `&handle` | any regular tag | the tag's DOM element |
| `&value` | `input`, `textarea`, `select` | input content; for a `multiple` `select`: Array or Set of selections |
| `&number` | `input` | the input value converted to a number |
| `&checked` | radio/checkbox `input`s | the checked state |
| `&group` | radio/checkbox `input`s | Array or Set holding the combined group state |

## Rules

1. Reference attributes simulate pass-by-reference: the variable is "passed by address" into an element or component, and under the hood a write is essentially a `setter` invocation, so multiple contexts share and operate on the same state source.
2. For form input, prefer `&value` over simulating the binding with a dynamic `!value={inputValue}` attribute plus `@input={inputValue = $arg.target.value}`; the reference attribute achieves the same synchronization concisely.
3. `&handle` is how you obtain the DOM element corresponding to a regular template tag; the variable receives the element after the component has finished mounting and rendering, as shown by reading it inside `onAfterMount`.
4. When the bound element is destroyed, the reference attribute automatically resets the bound variable to `null` to avoid dangling references.
5. Like dynamic attributes, when a reference attribute and variable share the same name, the interpolation block can be omitted: `<div &handle></div>` is equivalent to `<div &handle={handle}></div>`.
6. A reference attribute value must be an assignable (in other languages, usually called an lvalue or addressable), non-constant target — roughly an expression that can appear on the left side of `=`. Valid: `{identifier}`, `{arr[index]}`, `{obj.property}`.
7. In TypeScript, `&handle` values are strictly typed per tag (`HTMLDivElement` for `div`, `HTMLParagraphElement` for `p`); the receiver may also be typed as the base class `HTMLElement`.

## Constraints

- The shorthand omission is not supported when the attribute name is a keyword or reserved word in the embedded script language, such as `class` or `for`.
- Invalid reference attribute values: a function call `{test()}`, optional chaining `{arr?.[index]}` or `{obj?.property}`, or a ternary `{condition ? v1: v2}`.
- Non-constant is the general requirement, but the `&value` target of a `multiple` `select` may be `const` because Qingkuai only calls its methods (see [Forms](docs://agent/basic/forms.md)).
- `&handle` is demonstrated together with `onAfterMount`, a lifecycle callback that runs after a component has finished mounting and rendering; do not assume the reference is assigned before that.

## Examples

`&handle` DOM element reference:

```qk
<lang-js>
    let div = null

    onAfterMount(() => {
        console.log(div)
    })
</lang-js>

<div &handle={div}></div>
```

Automatic reset to `null` when the element is destroyed:

```qk
<lang-js>
    import { nextTick } from "qingkuai"

    let div = null
    let show = true

    function handleDestroyDiv() {
        show = false
        nextTick(() => {
            console.log(div) // logs: null
        })
    }
</lang-js>
<div #if={show} &handle={div}></div>
<button @click={handleDestroyDiv}>Destroy Div</button>
```

`&value` replacing `!value` + `@input`:

```qk
<lang-js>
    let inputValue = "Initial value"
</lang-js>

<p>The inputValue is: {inputValue}</p>

<input type="text" &value={inputValue} />
```

Shorthand when the variable name matches the attribute name:

```qk
<lang-js>
    let handle = null
</lang-js>

<div &handle></div>
```

## See also

- [Forms](docs://agent/basic/forms.md)
- [Component Attributes](docs://agent/components/attributes.md)
