---
description: "Qingkuai 样式表：作用域化的嵌入样式块、#scope 样式穿透、src/@import 外部样式、global 样式块，以及 qk-scope 选择器定位。"
keywords: ["style", "stylesheet", "scoped styles", "lang-css", "global", "#scope", "qk-scope", "样式"]
---

# 组件样式表

组件文件中的嵌入样式块（如 `<lang-css>`）是作用域化的：渲染的模板元素会收到一个作用域属性（如 `qk-dbb1016b`），样式规则的选择器也会被追加上该属性，避免全局污染。

## 语法

| 形式 | 语法 | 含义 |
|---|---|---|
| 作用域样式块 | `<lang-css> div { color: red; } </lang-css>` | 编译为 `div[qk-xxxx] { ... }` |
| 全局样式块 | `<lang-css global> ... </lang-css>` | 规则不附加作用域属性 |
| 外部样式表 | `<lang-scss src="./styles/theme.scss" />` | `src` 属性；该标签不能有内容 |
| 样式内导入 | 块体中的 `@import` 语句，如 `@import "./styles/base.css";` | 样式规则仍写在块体内 |
| 全局 + 外部 | `<lang-css global src="./index.css" />` | 两者组合 |
| 作用域属性定位 | `div[qk-scope] p { }` | `qk-scope` 属性选择器标记作用域属性落点：`div[qk-xxxx] p { }` |
| 样式穿透 | 组件标签上的 `#scope` 指令 | 把父级作用域属性传给子组件根元素（见编译指令） |

## 规则

1. 所有模板内容在渲染时都会收到作用域属性；嵌入样式规则自动以同一属性作用域化。
2. 作用域属性的默认位置在最后一个选择器之后（`div p[qk-xxxx]`、`.container .box[qk-xxxx]`）；用 `qk-scope` 属性选择器移动它。
3. 嵌入样式块可使用工具链支持的任意样式语言标签（`lang-css`、`lang-scss` 等）。
4. 组件标签上的 `#scope` 让父级样式作用于子组件根元素；可沿祖先链组合。

## 约束

- 使用 `src` 属性的样式标签不能包含标签内容。
- 避免同一份共享样式表被组件作用域样式通过 `src`/`@import` 重复引入——编译结果可能会生成多份附加不同作用域标识的等价规则副本；共享样式的复用方式参见性能优化文档。

## 示例

作用域化的嵌入样式：

```qk
<lang-css>
    div {
        color: red;
    }
</lang-css>

<div>Scoped red text</div>
```

全局样式块：

```qk
<lang-css global>
    .page-title {
        color: #111;
    }
</lang-css>

<h1 class="page-title">Page Title</h1>
```

外部样式源（书写形式；不参与编译示例）：

```text
<lang-scss src="./styles/theme.scss" />
<lang-css global src="./index.css" />

<lang-css>
    @import "./styles/base.css";
    .local-rule { color: #333; }
</lang-css>
```

作用域属性定位控制（CSS 视角）：

```css
/* 书写 */
div[qk-scope] p {
}
[qk-scope] .container .box {
}

/* 编译后 */
div[qk-dbb1016b] p {
}
[qk-dbb1016b] .container .box {
}
```

## 参见

- [编译指令](docs://zh-cn/agent/basic/compilation-directives.md)
- [性能优化](docs://zh-cn/agent/misc/optimization.md)
