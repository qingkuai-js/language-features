---
description: "Form element two-way binding in Qingkuai via reference attributes: &value on input/textarea/select, &number on input, &checked and &group on radio/checkbox inputs."
keywords: ["forms", "&value", "&number", "&checked", "&group", "two-way binding", "表单", "双向绑定"]
---

# Form Handling

## Syntax

| Attribute | Applicable elements | Bound target | Behavior |
| --- | --- | --- | --- |
| `&value` | `input`, `textarea` | variable holding the input content | Synchronizes the input content with the variable. |
| `&value` | `select` | single: value variable; `multiple`: Array or Set | Synchronizes the selected item(s). |
| `&number` | `input` | variable receiving a number | Synchronizes the input value after converting it to a number. |
| `&checked` | `input` with `type="radio"` or `type="checkbox"` | variable holding the checked state | Synchronizes the checked state with the variable. |
| `&group` | radio and checkbox `input`s | Array or Set | Synchronizes the combined state of multiple inputs. |

## Rules

1. `&value` on `input`/`textarea` keeps the input content synchronized with the bound script variable; `textarea` supports the same pattern as `input`.
2. `&value` on a single `select` synchronizes the selected item; the source example binds a string variable (`let selected = "TypeScript"`).
3. `&value` on a `multiple` `select` accepts an Array or Set, and the two are completely equivalent. The target may be a constant because Qingkuai only calls its methods and does not modify the target itself.
4. `&number` on `input` converts the input value into a number before synchronizing it to the target variable; when the input value cannot be converted into a valid number, the target is set to `NaN`.
5. `&checked` on radio/checkbox inputs synchronizes the checked state with the variable value; the source example binds booleans (`let radioChecked = false`).
6. `&group` on radio/checkbox inputs receives an Array or Set holding the combined state; the source example declares it `const` and reads each item's state via `checkedArr[index]`.

## Constraints

- `&number` writes `NaN` for non-numeric input; it should usually be used together with the `type="number"` attribute on the `input` tag to ensure the validity of the input value.
- The `const`-target exception is stated only for `&value` on a `multiple` `select`; in general a reference attribute value must be an assignable, non-constant target (see [Reference Attributes](docs://agent/basic/reference-attributes.md)).
- `&group` semantics for radio buttons are not exemplified in the source; only the checkbox + Array case is demonstrated.
- In the source examples, checkbox `&group` inputs are paired with `!id`/`!for` label bindings, and `select` options set `!value={item}`.

## Examples

Textarea with `&value`:

```qk
<lang-js>
    let inputValue = "Initial value"
</lang-js>

<p>The inputValue is: {inputValue}</p>
<textarea &value={inputValue}></textarea>
```

Radio/checkbox with `&checked`:

```qk
<lang-js>
    let radioChecked = false
    let checkboxChecked = false
</lang-js>

<input type="radio" &checked={radioChecked} />
<input type="checkbox" &checked={checkboxChecked} />
<p>radio: {radioChecked ? "" : "not"} checked</p>
<p>checkbox: {checkboxChecked ? "" : "not"} checked</p>
```

Checkbox `&group` with a `const` Array:

```qk
<lang-js>
    const checkedArr = []
    const choices = ["Qingkuai", "JavaScript", "TypeScript"]
</lang-js>

<qk:spread #for={item, index of choices}>
    <input type="checkbox" !id={"choice" + item} &group={checkedArr} />
    <label !for={"choice" + item} style="margin-right: 20px;">{item}</label>
</qk:spread>

<qk:spread #for={item, index of choices}>
    <p>{item}: {checkedArr[index] ? "" : "not"} checked</p>
</qk:spread>
```

Multi-select `&value` with a `const` Array (a `Set` is completely equivalent):

```qk
<lang-js>
    const selectedItems = ["Qingkuai", "TypeScript"]
    const choices = ["Qingkuai", "JavaScript", "TypeScript"]
</lang-js>

<select multiple &value={selectedItems}>
    <option !value={item} #for={item of choices}>{item}</option>
</select>
<p>Selected items: {selectedItems.join(", ")}</p>
```

## See also

- [Reference Attributes](docs://agent/basic/reference-attributes.md)
- [Event Handling](docs://agent/basic/event-handling.md)
