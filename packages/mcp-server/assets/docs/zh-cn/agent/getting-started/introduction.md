---
description: "Qingkuai 框架概览：基于响应式变量与组件化的编程模型、嵌入语言标签、设计哲学，以及相对其他框架的核心优势。"
keywords: ["introduction", "overview", "design philosophy", "virtual dom", "reactivity", "轻快"]
---

# 简介

Qingkuai（得名于中文「轻快」：轻量、响应快速、开发体验灵动）是一个用于构建 Web 界面的框架。它提供基于响应式变量与组件化界面的编程模型，由编译器将 `.qk` 文件转换为精简、高效、严格优化的 JavaScript。

## 组件结构

组件脚本写在嵌入语言标签内（`lang-js`、`lang-ts`、`lang-css`、`lang-scss`、`lang-sass`、`lang-less`、`lang-postcss`、`lang-stylus`），标签之外的内容即 HTML 模板。普通 `script`/`style` 标签不会被编译器处理——其原始内容会像普通 HTML 一样原样插入页面。

```qk
<lang-js>
    let count = 0
    let name = "World"

    setTimeout(() => {
        name = "Qingkuai"
    }, 1000)
</lang-js>

<h1> Hello {name}! </h1>

<button
    class="btn"
    @click={count++}
>
    You have clicked {count} times.
</button>

<lang-scss>
    // 在这里为组件中的 HTML 元素添加样式……
</lang-scss>
```

## 设计哲学

尽可能少地引入新语法，优先沿用主流框架中开发者已经熟悉的习惯（Vue/Svelte 的模板语法看起来相似是有意为之）；只有当既有设计明显不合理时才做必要调整。用 `lang-*` 标签而非 `script`/`style` 作为嵌入标签，主要是因为当这些标签带有多个属性和换行时，基于 Textmate 的语法高亮会失效。

## 核心优势

- **打包体积**：运行时约 8–24 KB（gzip 后 5–11 KB），高度可摇树优化（细粒度到单条指令）；编译产物通常为同类框架的 20%–80%。
- **响应性推导**：编译器根据顶层标识符的访问与写入方式推导响应性——脚本代码的写法非常接近原生 JS/TS（例如模板中使用的普通 `const person = {...}` 无需任何标记即获得响应式属性）。
- **开箱即用的 TypeScript**：无需额外配置；语言服务自动推导组件与插槽上下文的类型。
- **调试体验**：开发模式避免响应式声明噪音，并为指令声明的上下文标识符（`#for`、`#slot`）补充匹配的声明。
- **更新粒度**：没有虚拟 DOM——响应式变更直接映射为原生 DOM API 调用（例如一次点击只更新 `pElement.textContent = ...`），消除 diff 开销。

## 参见

- [安装](docs://zh-cn/agent/getting-started/install.md)
- [组件基础](docs://zh-cn/agent/components/basic.md)
- [响应性](docs://zh-cn/agent/basic/reactivity.md)
