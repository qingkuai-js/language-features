# Reference Attributes

In Qingkuai, reference attributes are a syntax for passing variable references by prefixing attribute names with `&` (such as `&value`). They let you establish a reference relationship between an attribute and an external variable in templates, so the attribute value can be read and written directly from outside, enabling flexible data linkage and state transfer.

JavaScript itself does not support [pass-by-reference](https://stackoverflow.com/questions/373419/whats-the-difference-between-passing-by-reference-vs-passing-by-value), but through the compiler's processing, Qingkuai's reference attributes can simulate the effect of reference (pointer) passing in languages such as C, C++, and Go — under the hood, this is essentially a `setter` invocation. With reference attributes, variables can be explicitly "passed by address" into an element or component, so you can share and operate on the same state source across multiple contexts. This mechanism is concise and powerful, improving both expressiveness and control in template state management. The following pseudocode helps illustrate the difference between pass-by-reference and pass-by-value:

```js
let num = 10

function passByValue(n) {
    // In pass-by-value, n is a copy of num,
    // and they are two separate locations in memory.
    // Modifying n does not affect the original num value.
    n = n + 1
}

function passByReference(n) {
    // * is the dereference operator. It is used to:
    // Read the value at the location pointed to by n,
    // then add 1 and write the result back to that location.
    *n = *n + 1
}

passByValue(num)
console.log(num) // logs: 10

// & is the address-of operator. It is used to:
// Get the memory address of variable num,
// then pass it as an argument to passByReference.
passByReference(&num)
console.log(num) // logs: 11
```

---

## Getting DOM Elements

When you need to get the DOM element corresponding to a regular tag in the template, you can do so by adding the `&handle` attribute to that element:

|js|ts|

```qk
<lang-js>
    let div = null

    onAfterMount(() => {
        console.log(div)
    })
</lang-js>

<div &handle={div}></div>
```

```qk
<lang-ts>
    let div!: HTMLDivElement | null = null

    onAfterMount(() => {
        console.log(div)
    })
</lang-ts>

<div &handle={div}></div>
```

> [!TIP]
> `onAfterMount` is a Qingkuai callback that runs after a component has finished mounting and rendering. It is part of the [component lifecycle](docs://components/lifecycle.md).

> [!TIP]
> If your embedded script language is [TypeScript](https://www.typescriptlang.org/), the value of `&handle` is strictly typed. For example, for a `div` tag, the type is [HTMLDivElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDivElement); for a `p` element, the type is [HTMLParagraphElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLParagraphElement). Of course, you can also define the receiver type as the base element class [HTMLElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement).

When the element is destroyed, the reference attribute automatically resets the bound variable to `null` to avoid dangling references:

|js|ts|

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

```qk
<lang-ts>
    import { nextTick } from "qingkuai"

    let show = true
    let div: HTMLDivElement | null = null

    function handleDestroyDiv() {
        show = false
        nextTick(() => {
            console.log(div) // logs: null
        })
    }
</lang-ts>
<div #if={show} &handle={div}></div>
<button @click={handleDestroyDiv}>Destroy Div</button>
```

Like dynamic attributes, when a reference attribute and variable share the same name, you can omit the interpolation block. So the following two forms are equivalent:

```qk
<div &handle></div>
<div &handle={handle}></div>
```

> [!WARNING]
> If the attribute name is a keyword or reserved word in the embedded script language, this syntax is not supported, such as `class` or `for`.

---

## Form Input Processing

When handling forms, we often need to synchronize input content to variables in the embedded script. In typical usage, we might use a dynamic `value` attribute on an `input` element and listen to user input to update the variable:

|js|ts|

```qk
<lang-js>
    let inputValue = "Initial value"
</lang-js>

The inputValue is: {inputValue}

<div>
    <input
        type="text"
        !value={inputValue}
        @input={inputValue = $arg.target.value}
    />
</div>
```

```qk
<lang-ts>
    let inputValue = "Initial value"
</lang-ts>

The inputValue is: {inputValue}

<div>
    <input
        type="text"
        !value={inputValue}
        @input={inputValue = ($arg.target as HTMLInputElement).value}
    />
</div>
```

Compared with the somewhat verbose approach above, we can now implement this more concisely through the `&value` reference attribute:

```qk
<lang-js>
    let inputValue = "Initial value"
</lang-js>

The inputValue is: {inputValue}

<div>
    <input
        type="text"
        &value={inputValue}
    />
</div>
```

> [!TIP]
> Here we only briefly introduced reference attributes in form input scenarios. More usage details will be covered in the [Form Handling](docs://basic/forms.md) section.

---

## Valid Values for Reference Attributes

Like in other languages that support pass-by-reference, the value of a reference attribute must be an assignable (in other languages, usually called an lvalue or addressable target) and non-constant target. You can roughly understand it as an expression that can appear on the left side of `=`:

```qk
<!-- Valid values -->
<p &handle={identifier}></p>
<p &handle={arr[index]}></p>
<p &handle={obj.property}></p>

<!-- Invalid values -->
<p &handle={test()}></p>
<p &handle={arr?.[index]}></p>
<p &handle={obj?.property}></p>
<p &handle={condition ? v1: v2}></p>
```
