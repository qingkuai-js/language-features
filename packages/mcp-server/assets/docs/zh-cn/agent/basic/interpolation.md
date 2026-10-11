---
description: "Qingkuai 插值块：文本插值、动态属性、动态 class 的对象/数组形式，以及花括号内仅允许表达式的规则。"
keywords: ["interpolation", "dynamic attribute", "class binding", "expression", "插值", "动态属性", "模板"]
---

# 插值块

Qingkuai 的模板语法几乎就是 HTML，但有细微差异：属性值必须用引号或花括号包裹；以 `!`、`@`、`#`、`&` 开头的属性名由编译器处理；以大写字母开头或包含 `-`、`.` 的标签名是组件标签（嵌入语言标签除外）；文本或属性值中的花括号开启一个插值块。

## 语法

| 形式 | 语法 | 含义 |
|---|---|---|
| 文本插值 | `<p>{variable}</p>` | 将表达式结果渲染为文本；值变化时自动更新 |
| 动态属性 | `<div !id={dynamicId}></div>` | `!` 前缀；值用花括号包裹 |
| 动态属性简写 | `<div !id></div>` | 标识符与属性名同名时等价于 `!id={id}`；属性名是语言关键字/保留字时不可用（如 `class`、`for`） |
| 动态 class（对象） | `!class={{ active, "dark-mode": isDarkMode }}` | 值为真的键会被应用进 class 列表 |
| 动态 class（数组） | `!class={[a, b, c]}` | 数组中的每一项都会被应用 |
| 静态 + 动态 class | `class="container" !class={list}` | 只有 `class` 允许在同一标签出现两次；编译器合并两份 class 列表 |

## 规则

1. 花括号内只允许表达式，即任何能出现在赋值右侧的内容。合法示例：`{a * b - 5}`、``{`Hello ${str}`}``、`{new Date()}`、`{() => {}}`、`{condition ? a : b}`、`{str.split("").reverse().join("")}`，甚至类/函数表达式 `{class MyClass{}}`。
2. 语句绝不合法，会触发致命编译错误：`{id;}`、`{return 10}`、`{const n = 10}`、`{if(cond){}}`、`{switch(v){}}`、`{for(const u of users){}}`、`{import {raw} from "qingkuai"}`。
3. 同一标签不能声明两个同名属性，即使一个是普通属性一个是动态属性。`class` 是唯一例外（允许一个普通 + 一个动态，由编译器合并）。

## 约束

- 属性值不加引号或花括号是致命编译错误。
- 简写 `!id`（即 `!id={id}`）在属性名是嵌入脚本语言的关键字或保留字时不可用。

## 示例

带响应式值的文本插值：

```qk
<lang-js>
    let variable = "Qingkuai"
</lang-js>

<p>value of variable is: {variable}</p>
```

动态属性，包括对象/数组形式的 class：

```qk
<lang-js>
    let dynamicId = "top-box"
    let active = true
    let isDarkMode = false
    let extra = "highlight"
</lang-js>

<div !id={dynamicId}></div>
<div
    !class={
        {
            active,
            "dark-mode": isDarkMode
        }
    }
></div>
<div class="container" !class={[extra]}></div>
```

简写等价形式：

```qk
<lang-js>
    let title = "hello"
</lang-js>

<div !title></div>
<div !title={title}></div>
```

语句不能出现在插值块内，以下均为致命错误：

```text
{id;}
{return 10}
{const number = 10}
{if(condition){}}
{for(const user of users){}}
```

## 参见

- [编译指令](docs://zh-cn/agent/basic/compilation-directives.md)
- [引用属性](docs://zh-cn/agent/basic/reference-attributes.md)
- [事件处理](docs://zh-cn/agent/basic/event-handling.md)
