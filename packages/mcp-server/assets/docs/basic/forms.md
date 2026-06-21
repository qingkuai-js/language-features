# Form Handling

In the earlier [Reference Attributes](docs://basic/reference-attributes.md) article, we already introduced the basic usage of obtaining variable references through the `&` syntax. In real development, the values of form elements often need to stay synchronized with state variables, so reference attributes are especially important in form handling scenarios. This section focuses on the usage details of reference attributes on form elements, explaining how this mechanism can be used to efficiently access and control form data and achieve reactive data binding and updates.

---

## Text Input

In the [Form Input Handling](docs://basic/reference-attributes.md#form-input-handling) section of the reference attributes article, we introduced how to use the `&value` reference attribute on an `input` tag to synchronize the input content with a variable in the embedded script. Similarly, `textarea` supports the same pattern:

```qk
<lang-js>
    let inputValue = "Initial value"
</lang-js>

<p>The inputValue is: {inputValue}</p>
<textarea &value={inputValue}></textarea>
```

In addition, the `input` tag can also accept a `&number` reference attribute, which synchronizes the input value to the target variable after converting it into a number:

```qk
<lang-js>
    let numericValue = 0
</lang-js>

<p>The numericValue is: {numericValue}</p>
<input type="number" &number={numericValue} />
```

<div class="custom-block warning">
    Note that the <code>&number</code> reference attribute sets the target variable to <code>NaN</code> when the input value cannot be converted into a valid number. For this reason, it is usually intended to be used together with <code>type="number"</code> on the <code>input</code> tag so that the input stays valid.
</div>

---

## Checkbox and Radio

For radio buttons and checkboxes, you can add `&checked` to synchronize the checked state with a variable value:

```qk
<lang-js>
    let radioChecked = false
    let checkboxChecked = false
</lang-js>

<input
    type="radio"
    &checked={radioChecked}
/>
<input
    type="checkbox"
    &checked={checkboxChecked}
/>
<p>radio: {radioChecked ? "" : "not"} checked</p>
<p>checkbox: {checkboxChecked ? "" : "not"} checked</p>
```

---

## Checkbox and Radio Groups

Sometimes you may need to synchronize the combined state of multiple radio buttons or checkboxes. In that case, you can use the `&group` attribute and pass in an [Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) or [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set):

|js|ts|

```qk
<lang-js>
    const checkedArr = []
    const choices = ["Qingkuai", "JavaScript", "TypeScript"]
</lang-js>

<qk:spread #for={item, index of choices}>
    <input
        type="checkbox"
        !id={"choice" + item}
        &group={checkedArr}
    />
    <label
        !for={"choice" + item}
        style="margin-right: 20px;"
    >
        {item}
    </label>
</qk:spread>

<qk:spread #for={item, index of choices}>
    <p>{item}: {checkedArr[index] ? "" : "not"} checked</p>
</qk:spread>
```

```qk
<lang-ts>
    const checkedArr: boolean[] = []
    const choices = ["Qingkuai", "JavaScript", "TypeScript"]
</lang-ts>

<qk:spread #for={item, index of choices}>
    <input
        type="checkbox"
        !id={"choice" + item}
        &group={checkedArr}
    />
    <label
        !for={"choice" + item}
        style="margin-right: 20px;"
    >
        {item}
    </label>
</qk:spread>

<qk:spread #for={item, index of choices}>
    <p>{item}: {checkedArr[index] ? "" : "not"} checked</p>
</qk:spread>
```

---

## Select

The `select` tag can use the `&value` reference attribute to synchronize the selected item:

```qk
<lang-js>
    let selected = "TypeScript"
    const choices = ["Qingkuai", "JavaScript", "TypeScript"]
</lang-js>

<select &value={selected}>
    <option
        !value={item}
        #for={item of choices}
    >
        {item}
    </option>
</select>
<p>Your selected: {selected}</p>
```

For a multi-select `select`, you can pass an [Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) or [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) to `&value`. In that case, the target may be a constant because Qingkuai only calls its methods and does not modify the target itself:

```qk
<lang-js>
    const selectedItems = ["Qingkuai", "TypeScript"]
    const choices = ["Qingkuai", "JavaScript", "TypeScript"]
</lang-js>

<select
    multiple
    &value={selectedItems}
>
    <option
        !value={item}
        #for={item of choices}
    >
        {item}
    </option>
</select>
<p>Selected items: {selectedItems.join(", ")}</p>
```

Using a `Set` is completely equivalent:

```qk
<lang-js>
    const selectedItems = new Set(["Qingkuai", "TypeScript"])
    const choices = ["Qingkuai", "JavaScript", "TypeScript"]
</lang-js>

<select
    multiple
    &value={selectedItems}
>
    <option
        !value={item}
        #for={item of choices}
    >
        {item}
    </option>
</select>
<p>Selected items: {Array.from(selectedItems).join(", ")}</p>
```
