---
description: "Form element handling using reference attributes for two-way data binding."
---

# Scope

Reference attribute usage patterns for form elements (extends docs://basic/reference-attributes.md).
`qk:spread` syntax reference: docs://misc/builtin-elements.md.

# Text Input

```qk
<lang-js>
    let inputValue = "Initial value"
</lang-js>
<input type="text" &value={inputValue} />
<p>Value: {inputValue}</p>
```

# Number Input

```qk
<input type="number" &number={numericValue} />
```

Behavior: Converts input to number; sets to `NaN` if invalid.

Constraint: Pair `&number` with `type="number"`.

# Textarea

```qk
<textarea &value={textValue}></textarea>
```

# Checkbox

```qk
<input type="checkbox" &checked={isChecked} />
<p>{isChecked ? "checked" : "not checked"}</p>
```

# Radio Button

```qk
<input type="radio" &checked={isSelected} />
```

# Checkbox Group

```qk
<lang-js>
    const checkedArr = []
    const choices = ["Qingkuai", "JavaScript", "TypeScript"]
</lang-js>

<qk:spread #for={item of choices}>
    <input
        type="checkbox"
        !id={"choice" + item}
        &group={checkedArr}
    />
    <label !for={"choice" + item}>{item}</label>
</qk:spread>

<qk:spread #for={item, index of choices}>
    <p>{item}: {checkedArr[index] ? "" : "not"} checked</p>
</qk:spread>
```

# Radio Group

Use `&group` with Array/Set same as checkbox group.

# Select (Single)

```qk
<lang-js>
    let selected = "TypeScript"
    const choices = ["Qingkuai", "JavaScript", "TypeScript"]
</lang-js>

<select &value={selected}>
    <option !value={item} #for={item of choices}>{item}</option>
</select>
<p>Selected: {selected}</p>
```

# Select (Multi-Select with Array)

```qk
<lang-js>
    const selectedItems = ["Qingkuai", "TypeScript"]
    const choices = ["Qingkuai", "JavaScript", "TypeScript"]
</lang-js>

<select multiple &value={selectedItems}>
    <option !value={item} #for={item of choices}>{item}</option>
</select>
<p>Selected: {selectedItems.join(", ")}</p>
```

Behavior: In `Array`/`Set` mode, runtime mutates the collection instead of reassigning target reference.

# Select (Multi-Select with Set)

```qk
<lang-js>
    const selectedItems = new Set(["Qingkuai", "TypeScript"])
    const choices = ["Qingkuai", "JavaScript", "TypeScript"]
</lang-js>

<select multiple &value={selectedItems}>
    <option !value={item} #for={item of choices}>{item}</option>
</select>
<p>Selected: {Array.from(selectedItems).join(", ")}</p>
```
