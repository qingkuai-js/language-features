# 样式表

样式表不仅用于美化页面，也常常是组件功能的重要补充。良好的样式体系不仅能提升用户体验，还能增强组件的表达力和复用性。在组件化开发中，传统全局样式容易引发冲突并增加维护成本，而作用域机制可以有效缓解这些问题。通过将样式限定在组件内部，开发者可以更放心地定义类名和规则，无需担心影响其他组件或页面元素。这种方式既保留了 CSS 的灵活性，也带来了更强的可控性与可维护性。

---

## 样式作用域

组件模板中的内容在渲染时都会被添加作用域属性，例如：

```html
<div>...</div>
```

会被渲染为类似这样的 HTML 片段：

```html
<div qk-dbb1016b>...</div>
```

为了避免组件样式污染全局或其他组件，嵌入样式同样会被添加作用域属性，例如：

```qk
<lang-css>
    div {
        color: red;
    }
</lang-css>
```

会被转换为：

```css
div[qk-dbb1016b] {
    color: red;
}
```

---

## 外部样式源

嵌入样式块支持两种方式引入外部样式文件：通过标签上的静态 `src` 属性，或通过样式内容中的 `@import` 语句：

```qk
<lang-scss src="./styles/theme.scss" />
```

> [!WARNING]
> 使用 `src` 属性时，嵌入样式标签不能包含标签内容。

使用 `@import` 时，样式规则在嵌入样式标签的内容体中编写：

```qk
<lang-css>
    @import "./styles/base.css";

    .local-rule {
        /* ... */
    }
</lang-css>
```

> [!WARNING]
> 通过 `src` 或 `@import` 被组件作用域样式重复引入同一份共享样式表时，编译结果可能会生成多份等价规则副本（附加不同作用域标识），应尽量避免这种模式：[优化 - 样式复用](docs://zh-cn/misc/optimization.md#样式复用)。

---

## 全局样式

默认情况下，嵌入样式会自动添加组件作用域属性。若希望当前样式块按全局样式处理，可在嵌入样式标签上添加布尔属性 `global`，例如下面的 `.page-title` 不会被附加组件作用域属性：

```qk
<lang-css global>
    .page-title {
        color: #111;
    }
</lang-css>
```

此外 `global` 也可以与 `src` 组合使用：

```qk
<lang-css global src="./index.css" />
```

---

## 作用域属性位置

通常情况下，作用域属性会被添加到最后一个选择器后：

```css
div p[qk-dbb1016b] {
}
.container .box[qk-dbb1016b] {
}
```

但我们可以通过 `qk-scope` 属性选择器手动调整作用域属性添加的位置，例如：

```css
div[qk-scope] p {
}
[qk-scope] .container .box {
}
```

会被转换为：

```css
div[qk-dbb1016b] p {
}
[qk-dbb1016b] .container .box {
}
```

---

## 样式穿透

作用域样式保证了组件的独立性，但某些场景下你可能希望父组件的样式规则能够影响到子组件的根元素。Qingkuai 提供了 [#scope 指令](docs://zh-cn/basic/compilation-directives.md#scope-指令) 来实现这一需求。
