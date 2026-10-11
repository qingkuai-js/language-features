# 表单处理

在前面的[引用属性](docs://zh-cn/basic/reference-attributes.md)文档中，我们已经初步了解了通过 `&` 语法获取变量引用的基本用法。在实际开发中，表单元素的值往往需要与状态变量保持同步，因此在表单处理场景中，引用属性显得尤为重要。本节将聚焦表单元素的引用属性使用细节，介绍如何借助这一机制高效地获取和控制表单数据，实现响应式的数据绑定与更新。

---

## 文本输入

在引用属性文档的[表单输入处理](docs://zh-cn/basic/reference-attributes.md#表单输入处理)部分中，我们介绍了如何在 `input` 标签上使用 `&value` 引用属性实现输入内容与嵌入脚本变量值间的同步。类似地，`textarea` 标签同样支持相同的用法：

```qk
<lang-js>
    let inputValue = "Initial value"
</lang-js>

<p>The inputValue is: {inputValue}</p>
<textarea &value={inputValue}></textarea>
```

此外 `input` 标签上还可接受一个 `&number` 引用属性，它的作用是将输入值转换为数字类型后同步给目标变量：

```qk
<lang-js>
    let numericValue = 0
</lang-js>

<p>The numericValue is: {numericValue}</p>
<input type="number" &number={numericValue} />
```

> [!WARNING]
> 需要注意的是，`&number` 引用属性会在输入值无法被转换为有效数字时将目标变量设置为 `NaN`，因此它通常应该与 `input` 标签的 `type="number"` 属性配合使用，以确保输入值的有效性。

---

## 选择框

对于单选框和复选框，可以为其添加 `&checked` 来同步选中状态与变量值：

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

## 选择框组合

有时你可能需要同步多个复选框或单选框的组合状态，此时可以使用 `&group` 属性，并传入[Array](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array) 或 [Set](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Set)来实现：

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

## 选择器

`select` 标签可使用 `&value` 引用属性同步选中的项目：

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

如果是支持多选的 `select`，可以为它的 `&value` 属性传入 [Array](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array) 或 [Set](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Set)。此时目标可以是常量，因为 Qingkuai 只会调用它的方法，而不会修改它本身：

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

换用 Set 也是完全等效的：

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
