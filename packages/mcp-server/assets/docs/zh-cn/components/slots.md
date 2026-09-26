# 插槽

组件插槽用于向组件传递一段结构化的 UI 内容（即模板片段），它与属性（attributes）最大的区别在于传递内容的类型不同：属性用于传递数据，而插槽用于传递界面结构。通过插槽，父组件可以将自定义 DOM 内容插入到子组件的指定位置，从而实现更高的灵活性和复用性。这使得插槽成为构建布局容器、弹窗、列表渲染等通用组件时不可或缺的机制。

<img src="/static/medias/component-slots.png" />

---

## 基本用法

在组件内部使用 `slot` 标签声明插槽位置，它被称作 [插槽出口](docs://zh-cn/references/terminology.md#插槽出口)，后续会统一使用这个术语指代 `slot` 标签所在的位置：

```qk
<!-- Inner.qk -->
<div class="inner-box">
    <slot></slot>
</div>
```

使用组件时，我们可以为其提供一个子元素来填充这个插槽，这个子元素被称作 [插槽内容](docs://zh-cn/references/terminology.md#插槽内容)：

```qk
<!-- Outer.qk -->
<Inner>...</Inner>
```

此时 `Outer` 组件的渲染结果为：

```html
<div class="inner-box">...</div>
```

当然，插槽内容不只局限于文本内容，还可以是元素、组件等任意合法的模板内容：

```qk
<Inner>
    <FontIcon name="tip" />
    <p #for={3}>...</p>
</Inner>
```

---

## 作用域

插槽内容可以访问其所在组件的数据：

```qk
<!-- Inner组件代码同上 -->
<lang-js>
    const langs = ["js", "ts", "qk"]
</lang-js>

<Inner>
    <p #for={item, index of langs}>
        {index + 1}/{langs.length}: {item}
    </p>
</Inner>
```

此时 `Outer` 组件的渲染结果为：

```html
<div class="inner-box">
    <p>1/3: js</p>
    <p>2/3: ts</p>
    <p>3/3: qk</p>
</div>
```

---

## 默认内容

`slot` 标签内的子元素会被视为插槽的默认内容。如果外部在使用组件时未传入插槽内容，那么默认内容会被渲染，这一点有些类似于 JavaScript 中函数参数的默认值：

```qk
<!-- Outer.qk -->
<Inner />
```

```qk
<!-- Inner.qk -->
<div class="inner-box">
    <slot>Default content</slot>
</div>
```

此时 `Outer` 组件的渲染结果为：

```html
<div class="inner-box">Default content</div>
```

---

## 指定插槽名称

很多时候，一个组件并不只有一个插槽。当组件拥有多个插槽时，我们需要通过 `name` 属性为它们指定名称以进行区分：

```qk
<!-- Article.qk -->
<article>
    <slot></slot>
</article>
<footer>
    <slot name="footer"></slot>
</footer>
```

> [!TIP]
> 未添加 `name` 属性的插槽名称默认为 `default`。

在使用组件时，可以通过 `slot` [指令](docs://zh-cn/basic/compilation-directives.md) 指定插槽名称：

```qk
<Article>
    <!-- 插槽名称为 default 时可省略 -->
    <div #slot={"default"}>Article contents...</div>
    <p #slot={"footer"}>Copyright informations...</p>
</Article>
```

当 [插槽内容](docs://zh-cn/references/terminology.md#插槽内容) 仅为一段文本，或希望避免添加额外的无意义标签时，可以使用 `qk:spread` [内置元素](docs://zh-cn/misc/builtin-elements.md) 作为虚拟父元素：

```qk
<Article>
    <qk:spread>Article contents...</qk:spread>
    <qk:spread #slot={"footer"}>
        <p>Released informations...</p>
        <p>Copyright informations...</p>
    </qk:spread>
</Article>
```

---

## 传递上下文

我们在本节的 [作用域](#作用域) 部分介绍过，插槽内容默认只能访问其所在组件的作用域数据。但在实际开发中，我们常常需要访问子组件内部的数据。为此，可以在 `slot` 标签上添加属性，并将这些属性作为上下文传递给 [插槽内容](docs://zh-cn/references/terminology.md#插槽内容)：

```qk
<!-- Article.qk -->
<article>
    <slot
        !time={article.time}
        !title={article.title}
    ></slot>
</article>
```

> [!TIP]
> `slot` 标签上的 `name` 属性仅用于指定插槽名称，不会被传递给插槽内容。

[插槽出口](docs://zh-cn/references/terminology.md#插槽出口) 处可以通过 `slot` [指令](docs://zh-cn/basic/compilation-directives.md) 接收这个上下文对象，并为其指定一个标识符以便使用：

```qk
<Article>
    <qk:spread #slot={articleInfo from "default"}>
        <h1>{articleInfo.title}</h1>
        <p>Published in {articleInfo.time}</p>
    </qk:spread>
</Article>
```

使用 `slot` 指令接收上下文对象时还可以直接解构它：

```qk
<Article>
    <qk:spread #slot={{ title, time } from "default"}>
        <h1>{title}</h1>
        <p>Published in {time}</p>
    </qk:spread>
</Article>
```

> [!WARNING]
> 解构上下文对象后，解构得到的值通常会失去响应性。但如果其中某个值本身是响应式的复杂结构，那么访问其属性时，响应性仍然会保留。使用解构语法时需要特别注意这一点。

---

## 根据传递状态渲染

有些情况下，我们需要根据某个插槽是否已被传递，来决定组件是否渲染对应的结构。此时可以使用 `slots` 内建标识符。`slots` 是一个对象，访问其中与插槽名称对应的属性会得到一个布尔值：若该插槽已被传递，则结果为 `true`；否则为 `false`。

下面的示例中，只有当外部实际传入了 `footer` 插槽内容时，页脚区域才会被渲染：

```qk
<section class="panel">
    <div class="panel-content">
        <slot></slot>
    </div>

    <footer
        class="panel-footer"
        #if={slots.footer}
    >
        <slot name="footer"></slot>
    </footer>
</section>
```
