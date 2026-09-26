---
description: "Qingkuai 插槽：声明插槽出口、具名插槽、回退内容、作用域插槽上下文，以及按插槽存在性渲染。"
keywords: ["slot", "slots", "scoped slot", "slot context", "插槽", "作用域插槽"]
---

# 插槽

插槽向组件传入结构化的 UI 内容——模板片段；属性传数据，插槽传界面结构。子组件内 `slot` 标签声明插入点（插槽出口），写在组件标签上的子元素即插槽内容。

## 语法

| 特性 | 子级（插槽出口） | 父级（插槽内容） |
|---|---|---|
| 默认插槽 | `<slot></slot>` | `<Inner>...</Inner>` |
| 具名插槽 | `<slot name="footer"></slot>` | `<p #slot={"footer"}>...</p>` |
| 显式默认名 | （未命名的插槽名为 `default`） | `<div #slot={"default"}>...</div>`（可省略名称） |
| 虚拟父级（纯文本/避免包装） | — | `<qk:spread #slot={"footer"}>...</qk:spread>` |
| 回退内容 | `<slot>Default content</slot>` | （未传入内容时） |
| 上下文传递 | `<slot !time={article.time} !title={article.title}></slot>` | `#slot={articleInfo from "default"}` |
| 上下文解构 | — | `#slot={{ title, time } from "default"}` |
| 存在性检查 | `#if={slots.footer}` | — |

内建 `slots` 对象将插槽名映射为布尔值：该插槽被传入时为 `true`，否则为 `false`。

## 规则

1. 插槽内容可以是任意合法模板内容：文本、元素、组件与指令（如 `#for`）。
2. 插槽内容只能访问它书写处组件作用域的数据；子组件数据只能通过插槽上下文获取。
3. 没有 `name` 属性的插槽名为 `default`。用 `slot` 指令 `#slot={...}` 指定目标插槽；目标为 `default` 时可省略名称。
4. `slot` 标签内部的子元素是插槽的默认（回退）内容，外部未传入插槽内容时渲染。
5. 加在 `slot` 标签上的属性作为上下文传给插槽内容；在出口处以 `identifier from "slotName"` 或解构 `{{ a, b } from "slotName"}` 接收。
6. `#if={slots.footer}` 式检查让组件可以按特定插槽是否被传入来条件渲染部分结构。

## 约束

- `slot` 标签上的 `name` 属性仅用于指定插槽名称，不会被传递给插槽内容。
- 解构后的上下文值通常会失去响应性；若某个值本身是响应式的复杂结构，其属性访问仍保持响应式。
- 插槽内容为纯文本、或要避免添加无意义包装标签时，使用 `qk:spread` 内建元素作为虚拟父级。

## 示例

默认与具名插槽：

```qk
<!-- Article.qk -->
<article>
    <slot></slot>
</article>
<footer>
    <slot name="footer">Default footer</slot>
</footer>
```

```qk
<!-- Outer.qk -->
<lang-js>
    import Article from "./Article.qk"
</lang-js>

<Article>
    <qk:spread>Article contents...</qk:spread>
    <qk:spread #slot={"footer"}>
        <p>Release information...</p>
    </qk:spread>
</Article>
```

作用域插槽上下文：

```qk
<!-- Article.qk -->
<lang-js>
    const article = { time: "2026-09-01", title: "Hello" }
</lang-js>

<article>
    <slot !time={article.time} !title={article.title}></slot>
</article>
```

```qk
<!-- Outer.qk -->
<lang-js>
    import Article from "./Article.qk"
</lang-js>

<Article>
    <qk:spread #slot={{ title, time } from "default"}>
        <h1>{title}</h1>
        <p>Published in {time}</p>
    </qk:spread>
</Article>
```

按插槽存在性渲染：

```qk
<!-- Panel.qk -->
<section class="panel">
    <div class="panel-content">
        <slot></slot>
    </div>
    <footer class="panel-footer" #if={slots.footer}>
        <slot name="footer"></slot>
    </footer>
</section>
```

## 参见

- [组件属性](docs://zh-cn/agent/components/attributes.md)
- [编译指令](docs://zh-cn/agent/basic/compilation-directives.md)
