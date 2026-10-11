# 简介

Qingkuai 取自中文“轻快”的拼音，寓意框架以 `轻` 量级、`快` 响应与更 `轻快` 的开发体验为核心。它是一个用于构建 Web 界面与交互功能的框架，提供变量响应化与界面组件化的编程模型，并通过编译器将 `.qk` 文件源码转换为极简、高效且严格优化的 `JavaScript` 代码。

在编写组件时，可以将组件脚本写在嵌入语言标签中。这些标签都以 `lang-` 开头，如 `lang-js`；标签外部则用于编写 HTML 模板。下面是一个简单的组件示例：

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
    // 在此为组件中的 HTML 元素添加样式...
</lang-scss>
```

可用的嵌入语言标签包括：`js`、`ts`、`css`、`scss`、`sass`、`less`、`postcss`、`stylus`。需要注意的是，`script` 和 `style` 标签中的代码不会被编译器处理，其原始内容会被保留并插入页面（即与普通 HTML 中表现一致）：

```qk
<script>
    // 向 HTML 中插入同样内容的 script 标签
</script>

<style>
    /* 向 HTML 中插入同样内容的 style 标签 */
</style>
```

---

## 语法设计

Qingkuai 的语法设计理念是尽可能少造新语法，优先采用现有主流框架的语法习惯；只有在现有设计存在明显不合理之处时，才会做出必要调整。这一理念旨在最大程度降低学习成本，使开发者能够快速上手并专注于业务本身。

不使用 `script` 和 `style` 作为嵌入语言标签，并不单纯是为了突出框架的个性化，而是出于实际兼容性考虑：当这些标签包含多个属性并换行时，会导致基于 [Textmate](https://macromates.com) 的语法高亮失效：

<!-- prettier-ignore -->
```html
<style
    scoped
    lang="scss"
>
    /* 此处不能正确高亮scss */
</style>
```

> [!TIP]
> 如果你使用过 [Vue](https://cn.vuejs.org) 或 [Svelte](https://svelte.dev)，会发现其模板语法在许多方面与它们相似。这是设计时特意保留的，目的正是降低学习成本。但在语法相似的背后，其设计取舍与工程实现路径仍有一定差异。

---

## 为何选择 ​Qingkuai？

与目前流行的前端框架相比，Qingkuai 具有以下核心优势：

- 编译体积：运行时体积非常小（约 8~24 KB，gzip：5~11 KB），并支持高度的 [Tree-Shaking](https://developer.mozilla.org/zh-CN/docs/Glossary/Tree_shaking) 优化。同时，编译器对输出文件体积也做了深度优化；在常见业务场景与默认构建配置下，编译结果通常约为其他框架的 20%~80%，实际比例会受组件复杂度和依赖规模影响；

- 响应性：编译器会根据顶层作用域标识符的访问/写入状态推导其响应性。因此，当你在嵌入脚本块中编写代码时，会获得与原生 JS/TS 接近的体验。可以结合下面的代码进行理解：

    ```qk
    <lang-js>
        // 编译器推导出 person 需要具有响应性
        const person = {
            age: 30,
            name: "javascript"
        }

        // person 的属性具有响应性，修改后 h1 元素会被更新
        setTimeout(() => {
            person.age = 1
            person.name = "Qingkuai"
        }, 1000)
    </lang-js>

    <h1>My name is {person.name}, I'm {person.age} years old.</h1>
    ```

- TypeScript：框架开箱支持 [TypeScript](https://www.typescriptlang.org/zh/)，无需额外配置。这有助于在开发时规避许多潜在 bug。此外，语言服务器还针对组件文件的类型提示与推导做了大量细节处理，例如自动推导组件和插槽上下文标识符的类型等。

- 调试体验：编译器生成的代码针对调试做了大量适配，以提升调试体验。例如在开发模式下避免响应式声明噪音干扰，并为 [for](docs://zh-cn/basic/compilation-directives.md#列表渲染) 和 [slot](docs://zh-cn/components/slots.md#传递上下文) 指令声明的上下文标识符添加对等声明等。

- 更新粒度：Qingkuai 不使用 `虚拟 DOM`，响应性变量的变更会直接映射为原生 `DOM API` 调用。这种机制去除了虚拟 DOM 的 `diff` 开销，观察下面的代码：

    ```qk
    <lang-js>
        let count = 0
    </lang-js>

    <p>You clicked {count} times.</p>
    <button @click={count++}>Add Count</button>
    ```

    按钮被点击后，框架会异步调度页面更新，期间会调用一条类似如下的伪代码：

    ```js
    pElement.textContent = `You clicked ${count} times.`
    ```

> [!TIP]
> `@click` 的作用是为 button 元素添加点击事件监听器，按钮点击后会执行 `count++` 这条 JavaScript 表达式。关于事件监听器等更多模板语法，我们会在后文详细介绍。
