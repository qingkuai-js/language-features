---
description: "Pass-by-reference syntax for DOM elements, form inputs, and bidirectional data binding."
---

# Scope

Reference attributes (`&` prefix) for establishing read/write references between template and variables, enabling pass-by-reference semantics.
`qk:spread` syntax reference: docs://misc/builtin-elements.md.

# Accessing DOM Elements

```qk
<lang-js>
    import { onAfterMount } from "qingkuai"
    let div = null
    onAfterMount(() => {
        console.log(div)  // HTMLDivElement instance
    })
</lang-js>
<div &dom={div}></div>
```

## TypeScript Types

Automatically inferred:

- `<div>` → `HTMLDivElement`
- `<p>` → `HTMLParagraphElement`
- Generic: `HTMLElement`

## Shorthand

```qk
<div &dom></div>    <!-- equivalent to: <div &dom={dom}></div> -->
```

Constraint: Not supported if attribute name is keyword.

# Form Input Handling

## Input Value

```qk
<lang-js>
    let inputValue = "Initial value"
</lang-js>
<input type="text" &value={inputValue} />
```

Synchronizes input value with variable bidirectionally.

## Number Input

```qk
<input type="number" &number={numericValue} />
```

Converts input to number before assignment; sets `NaN` if invalid.

## Textarea

```qk
<textarea &value={textValue}></textarea>
```

# Checkbox and Radio

```qk
<input type="checkbox" &checked={isChecked} />
<input type="radio" &checked={isSelected} />
```

# Checkbox and Radio Groups

```qk
<lang-js>
    const checkedArr = []
    const choices = ["A", "B", "C"]
</lang-js>

<qk:spread #for={item of choices}>
    <input type="checkbox" &group={checkedArr} !value={item} />
    <label>{item}</label>
</qk:spread>
```

Supports Array or Set; group value contains selected items.

# Select

## Single Select

```qk
<select &value={selected}>
    <option !value={item} #for={item of choices}>{item}</option>
</select>
```

## Multi-Select

```qk
<lang-js>
    const selectedItems = ["A", "C"]
    const choices = ["A", "B", "C"]
</lang-js>
<select multiple &value={selectedItems}>
    <option !value={item} #for={item of choices}>{item}</option>
</select>
```

With Set:

```qk
<lang-js>
    const selectedItems = new Set(["A", "C"])
</lang-js>
<select multiple &value={selectedItems}>
    <option !value={item} #for={item of choices}>{item}</option>
</select>
```

# Valid Reference Attribute Values

Must be addressable (can appear on left side of assignment):

✓ Valid:

```qk
<p &dom={identifier}></p>
<p &dom={arr[index]}></p>
<p &dom={obj.property}></p>
```

✗ Invalid:

```qk
<p &dom={test()}></p>              <!-- function call -->
<p &dom={arr?.[index]}></p>        <!-- optional chaining -->
<p &dom={obj?.property}></p>       <!-- optional chaining -->
<p &dom={condition ? v1 : v2}></p> <!-- ternary -->
```
