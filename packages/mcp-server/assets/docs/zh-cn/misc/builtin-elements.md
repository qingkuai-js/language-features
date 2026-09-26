# 内置元素

在 Qingkuai 中，内置元素用于扩展模板语法，提供比标准 HTML 更强的表达能力。它们通常承担框架层面的特殊职责，具有特定语义与行为，在处理渲染逻辑或控制结构时扮演重要角色。内置元素通常以 `qk:` 开头，这样做是为了避免与未来的 HTML 内置标签冲突，或占用组件的命名空间。

---

## Spread

在之前章节的示例代码中，我们已经多次使用过 `qk:spread` 内置元素。它的主要作用是作为指令的虚拟挂载点，其子元素会统一受到所挂载指令的影响。最关键的是，它本身不会被渲染为实际的 HTML 元素，从而不会干扰最终页面结构。

假设我们想循环创建多个 p + button 元素，但不想额外引入一个无意义的父元素，就可以这样做：

```qk
<qk:spread #for={3}>
    <p>...</p>
    <button>Click Me</button>
</qk:spread>
```

再比如，当我们需要按条件展示多个 `li` 元素时：

```qk
<ul class="list">
    <li>normal list 1</li>
    <li>normal list 2</li>
    <qk:spread #if={visible}>
        <li>extra list 3</li>
        <li>extra list 4</li>
    </qk:spread>
</ul>
```

当插槽内容由多个并列元素组成时：

```qk
<Component>
    <qk:spread #slot={"default"}>
        <p>some</p>
        <p>contents</p>
    </qk:spread>
</Component>
```

为一个文本节点添加指令：

```qk
<qk:spread
    #await={pms}
    #then={target}
>
    {target} is loaded.
</qk:spread>
```

> [!TIP]
> 可以看出一个共同点：`qk:spread` 通常用于为多个没有共同父元素的并列元素统一添加指令，这也正是其名称中 “spread” 所表达的含义：分散、展开。
