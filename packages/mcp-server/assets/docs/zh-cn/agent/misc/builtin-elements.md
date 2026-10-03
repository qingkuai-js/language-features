---
description: "Qingkuai 内置元素：qk:spread 作为兄弟节点组与文本节点的指令虚拟挂载点，本身不渲染。"
keywords: ["built-in element", "qk:spread", "virtual element", "内置元素"]
---

# 内置元素

内置元素用于扩展模板语法、承担框架层面的特殊职责，提供比标准 HTML 更强的表达能力。它们以 `qk:` 为前缀，避免与未来 HTML 内置标签冲突或占用组件命名空间。

## 语法

| 元素 | 语法 | 含义 |
|---|---|---|
| `qk:spread` | `<qk:spread #for={...}>...</qk:spread>` | 指令的虚拟挂载点；被挂载的指令共同作用于全部子元素；不会被渲染为真实 HTML 元素 |

## 规则

1. 用 `qk:spread` 把指令统一作用于没有共同父元素的多个并列元素，这正是"spread"一词的含义：分散、展开。
2. 典型场景：`#for` 循环创建多个 `p + button` 元素、`#if` 按条件展示多个 `li`、`#slot` 包装由多个并列元素组成的插槽内容。
3. 也可以把指令附加到文本节点上。
4. 优先用 `qk:spread` 而不是额外引入无意义的父元素，它不会干扰最终页面结构。

## 示例

无包装地循环渲染兄弟组：

```qk
<qk:spread #for={3}>
    <p>...</p>
    <button>Click Me</button>
</qk:spread>
```

按条件展示多个列表项：

```qk
<lang-js>
    let visible = true
</lang-js>

<ul class="list">
    <li>normal list 1</li>
    <li>normal list 2</li>
    <qk:spread #if={visible}>
        <li>extra list 3</li>
        <li>extra list 4</li>
    </qk:spread>
</ul>
```

多元素插槽内容：

```qk
<Component>
    <qk:spread #slot={"default"}>
        <p>some</p>
        <p>contents</p>
    </qk:spread>
</Component>
```

文本节点上的指令：

```qk
<lang-js>
    const pms = Promise.resolve("data")
</lang-js>

<qk:spread
    #await={pms}
    #then={target}
>
    {target} is loaded.
</qk:spread>
```

## 参见

- [编译指令](docs://zh-cn/agent/basic/compilation-directives.md)
- [插槽](docs://zh-cn/agent/components/slots.md)
