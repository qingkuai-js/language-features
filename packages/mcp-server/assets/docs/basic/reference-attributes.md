---
description: ""
---

# Reference Attributes

In Qingkuai, reference attributes are a syntax for passing variable references by prefixing attribute names with `&` (such as `&value`). They let you establish a reference relationship between an attribute and an external variable in templates, so the attribute value can be read and written directly from outside, enabling flexible data linkage and state transfer.

JavaScript itself does not support [pass-by-reference](https://stackoverflow.com/questions/373419/whats-the-difference-between-passing-by-reference-vs-passing-by-value), but Qingkuai implements a mechanism similar to reference (pointer) passing in languages such as C, C++, and Go (its essence is setter invocation). With reference attributes, variables can be explicitly "passed by address" into an element or component, so you can share and operate on the same state source across multiple contexts. This mechanism is concise and powerful, improving both expressiveness and control in template state management. The following pseudocode helps illustrate the difference between pass-by-reference and pass-by-value:

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
console.log(num) // 10

// & is the address-of operator. It is used to:
// Get the memory address of variable num,
// then pass it as an argument to passByReference.
passByReference(&num)
console.log(num) // 11
```

---

## Getting DOM Elements

When you need to get the DOM element corresponding to a regular tag in the template, you can do so by adding the `&handle` attribute to that element:

|js|ts|

```qk
<lang-js>
    import { onAfterMount } from "qingkuai"

    let div = null

    onAfterMount(() => {
        console.log(div)
    })
</lang-js>

<div &handle={div}></div>
```

```qk
<lang-ts>
    import { onAfterMount } from "qingkuai"

    let div!: HTMLDivElement | null = null

    onAfterMount(() => {
        console.log(div)
    })
</lang-ts>

<div &handle={div}></div>
```

<div class="custom-block tip">
    <code>onAfterMount</code> is a Qingkuai callback that runs after a component has finished mounting and rendering. It is part of the <a href="docs://components/lifecycle.md">component lifecycle</a>.
</div>

<div class="custom-block tip">
    If your embedded script language is <a href="https://www.typescriptlang.org/">TypeScript</a>, the value of <code>&handle</code> is strictly typed. For example, for a <code>div</code> tag, the type is <a href="https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLDivElement">HTMLDivElement</a>; for a <code>p</code> element, the type is <a href="https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLParagraphElement">HTMLParagraphElement</a>. You can also define the receiver type as the base element class <a href="https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLElement">HTMLElement</a>.
</div>

When the element is destroyed, the reference attribute automatically resets the bound variable to `null` to avoid dangling references:

|js|ts|

```qk
<lang-js>
    import { onAfterMount, nextTick } from "qingkuai"

    let div = null
    let show = true

    function handleDestroyDiv() {
        show = false
        nextTick(() => {
            console.log(div) // null
        })
    }
</lang-js>
<div #if={show} &handle={div}></div>
<button @click={handleDestroyDiv}>Destroy Div</button>
```

```qk
<lang-ts>
    import { onAfterMount, nextTick } from "qingkuai"

    let show = true
    let div: HTMLDivElement | null = null

    function handleDestroyDiv() {
        show = false
        nextTick(() => {
            console.log(div) // null
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

<div class="custom-block warning">
    If the attribute name is a keyword or reserved word in the embedded script language, this syntax is not supported, such as <code>class</code> or <code>for</code>.
</div>

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

<div class="custom-block tip">
    Here we only briefly introduced reference attributes in form input scenarios. More usage details will be covered in the <a href="docs://basic/forms.md">Form Handling</a> section.
</div>

---

## Valid Values for Reference Attributes

Like in other languages that support pass-by-reference, the value of a reference attribute must be an assignable (often called an lvalue or addressable target) and non-constant target. You can roughly understand it as an expression that can appear on the left side of `=`:

```qk
<!-- Valid values -->
<p &dom={identifier}></p>
<p &dom={arr[index]}></p>
<p &dom={obj.property}></p>

<!-- Invalid values -->
<p &dom={test()}></p>
<p &dom={arr?.[index]}></p>
<p &dom={obj?.property}></p>
<p &dom={condition ? v1: v2}></p>
```
