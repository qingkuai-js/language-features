---
description: "Qingkuai 通过引用属性实现表单元素双向绑定：input/textarea/select 上的 &value、input 上的 &number、单选/复选输入上的 &checked 与 &group。"
keywords: ["forms", "&value", "&number", "&checked", "&group", "two-way binding", "表单", "双向绑定"]
---

# 表单处理

## 语法

| 属性 | 适用元素 | 绑定目标 | 行为 |
| --- | --- | --- | --- |
| `&value` | `input`、`textarea` | 保存输入内容的变量 | 输入内容与变量同步。 |
| `&value` | `select` | 单选：值的变量；`multiple`：Array 或 Set | 同步选中的项。 |
| `&number` | `input` | 接收数字的变量 | 将输入值转换为数字后同步。 |
| `&checked` | `type="radio"` 或 `type="checkbox"` 的 `input` | 保存选中状态的变量 | 选中状态与变量同步。 |
| `&group` | 单选和复选 `input` | Array 或 Set | 同步多个输入的组合状态。 |

## 规则

1. `input`/`textarea` 上的 `&value` 使输入内容与绑定的脚本变量保持同步；`textarea` 支持与 `input` 相同的模式。
2. 单选 `select` 上的 `&value` 同步选中项；示例中绑定的是字符串变量（`let selected = "TypeScript"`）。
3. `multiple` 的 `select` 上的 `&value` 接受 Array 或 Set，两者完全等价。目标可以是常量，因为 Qingkuai 只调用其方法、不修改目标本身。
4. `input` 上的 `&number` 在同步到目标变量之前把输入值转换为数字；输入值无法转换为有效数字时目标被置为 `NaN`。
5. 单选/复选输入上的 `&checked` 将选中状态与变量值同步；示例绑定布尔值（`let radioChecked = false`）。
6. 单选/复选输入上的 `&group` 接收保存组合状态的 Array 或 Set；示例将其声明为 `const`，并通过 `checkedArr[index]` 读取各项状态。

## 约束

- `&number` 对非数字输入写入 `NaN`；它通常应与 `input` 标签的 `type="number"` 属性配合使用，以确保输入值的有效性。
- `const` 目标例外仅针对 `multiple` `select` 上的 `&value`；一般情况下引用属性的值必须是可赋值、非常量的目标（参见[引用属性](docs://zh-cn/agent/basic/reference-attributes.md)）。
- `&group` 对单选按钮的语义没有在文档中示例；仅演示了复选框 + Array 的情况。
- 示例中复选框 `&group` 输入与 `!id`/`!for` 的 label 绑定成对出现，`select` 的选项设置 `!value={item}`。

## 示例

`&value` 绑定 textarea：

```qk
<lang-js>
    let inputValue = "Initial value"
</lang-js>

<p>The inputValue is: {inputValue}</p>
<textarea &value={inputValue}></textarea>
```

单选/复选使用 `&checked`：

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

复选框 `&group` 搭配 `const` 数组：

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

多选 `&value` 搭配 `const` 数组（`Set` 完全等价）：

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

## 参见

- [引用属性](docs://zh-cn/agent/basic/reference-attributes.md)
- [事件处理](docs://zh-cn/agent/basic/event-handling.md)
