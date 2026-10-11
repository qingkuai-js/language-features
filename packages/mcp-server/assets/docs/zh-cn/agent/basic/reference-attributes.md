---
description: "Qingkuai 引用属性通过 & 前缀属性传递变量引用（DOM 元素用 &handle，表单状态用 &value/&number/&checked/&group），本质是 setter 调用。"
keywords: ["reference attributes", "&value", "&checked", "&handle", "refs", "two-way binding", "引用属性", "双向绑定"]
---

# 引用属性

## 语法

引用属性在属性名前加 `&` 前缀（如 `&value`）来传递变量引用，使属性值可以从外部直接读写。

| 属性 | 适用对象 | 接收内容 |
| --- | --- | --- |
| `&handle` | 任意常规标签 | 该标签的 DOM 元素 |
| `&value` | `input`、`textarea`、`select` | 输入内容；`multiple` 的 `select` 为 Array 或 Set |
| `&number` | `input` | 转换为数字后的输入值 |
| `&checked` | radio/checkbox `input` | 选中状态 |
| `&group` | radio/checkbox `input` | 保存组合状态的 Array 或 Set |

## 规则

1. 引用属性模拟引用传递：变量被"按地址"传入元素或组件，写入本质是一次 `setter` 调用，多个上下文因此共享并操作同一状态源。
2. 表单输入优先使用 `&value`，而不是用动态 `!value={inputValue}` 属性加 `@input={inputValue = $arg.target.value}` 模拟绑定；引用属性以更简洁的方式实现同样的同步。
3. `&handle` 是获取常规模板标签对应 DOM 元素的方式；组件完成挂载与渲染后变量才收到该元素，在 `onAfterMount` 中读取即可观察到这一点。
4. 被绑定元素销毁时，引用属性自动将绑定变量重置为 `null`，避免悬空引用。
5. 与动态属性一样，引用属性与变量同名时插值块可省略：`<div &handle></div>` 等价于 `<div &handle={handle}></div>`。
6. 引用属性的值必须是可赋值（其他语言中通常称为左值或可取址）、非常量的目标，大致是能出现在 `=` 左侧的表达式。合法：`{identifier}`、`{arr[index]}`、`{obj.property}`。
7. 在 TypeScript 中，`&handle` 的值按标签严格定类型（`div` 为 `HTMLDivElement`，`p` 为 `HTMLParagraphElement`）；接收方类型也可以定义为基类 `HTMLElement`。

## 约束

- 属性名是嵌入脚本语言的关键字或保留字（如 `class`、`for`）时不支持省略简写。
- 不合法的引用属性值：函数调用 `{test()}`、可选链 `{arr?.[index]}` 或 `{obj?.property}`、三元表达式 `{condition ? v1: v2}`。
- "非常量"是一般性要求，但 `multiple` `select` 的 `&value` 目标可以是 `const`，因为 Qingkuai 只调用其方法（参见[表单处理](docs://zh-cn/agent/basic/forms.md)）。
- `&handle` 与 `onAfterMount` 一起演示，它是组件挂载并渲染完成后运行的生命周期回调；不要假设引用在此之前已被赋值。

## 示例

`&handle` DOM 元素引用：

```qk
<lang-js>
    let div = null

    onAfterMount(() => {
        console.log(div)
    })
</lang-js>

<div &handle={div}></div>
```

元素销毁时自动重置为 `null`：

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

`&value` 替代 `!value` + `@input`：

```qk
<lang-js>
    let inputValue = "Initial value"
</lang-js>

<p>The inputValue is: {inputValue}</p>

<input type="text" &value={inputValue} />
```

变量名与属性名相同时的简写：

```qk
<lang-js>
    let handle = null
</lang-js>

<div &handle></div>
```

## 参见

- [表单处理](docs://zh-cn/agent/basic/forms.md)
- [组件属性](docs://zh-cn/agent/components/attributes.md)
