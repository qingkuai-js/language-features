---
description: "Qingkuai 编译指令：#if/#elif/#else、#for、#key、#await/#then/#catch、#html、#target、#scope、#slot —— 精确用法形式、语义、优先级顺序与约束。"
keywords: ["#if", "#elif", "#else", "#for", "#key", "#await", "#then", "#catch", "#html", "#target", "#scope", "#slot", "qk:spread", "directive", "指令", "条件渲染", "列表渲染", "异步"]
---

# 编译指令

指令是以 `#` 为前缀的特殊属性，告诉编译器如何生成对应的 JavaScript。优先级链（从高到低）：`slot` > `await/then/catch` > `if/elif/else` > `target` > `for/key` > `html`。未列出的指令按标签中的出现顺序处理。

## 语法

| 指令 | 用途 | 形式 |
|---|---|---|
| `#if` / `#elif` / `#else` | 条件渲染 | `#if={expr}`、`#elif={expr}`、裸 `#else` |
| `#for` | 列表渲染 | `#for={n}` 或 `#for={item, index of source}` |
| `#key` | 列表内节点标识 | `#key={expr}` |
| `#await` / `#then` / `#catch` | 异步渲染状态 | `#await={promise}`；`#then` / `#then={res}`；`#catch` / `#catch={err}` |
| `#html` | 将文本渲染为 HTML 片段 | 裸 `#html` 或 `#html={config}` |
| `#target` | 挂载到其他父元素 | `#target={cssSelector}` 或 `#target={HTMLElement}` |
| `#scope` | 将父级作用域属性传给子组件根元素 | 裸 `#scope`，仅限组件标签 |
| `#slot` | 在组件中接收插槽上下文 | `#slot={name}` |

## 规则

1. `#if` / `#elif` / `#else` 对应 JavaScript 的 `if` / `else if` / `else`。`#elif` 与 `#else` 必须跟在 `#if` 分支之后。
2. `#for` 接受数字、数组、对象、字符串、`Set`、`Map` 或求值为这些类型的表达式。`#for={3}` 渲染三份。
3. 迭代命名使用 `of`：`#for={item, index of source}`。item 或 index 位置允许解构（如 `#for={{ name, age }, extension of languageInfos}`）。
4. 对于对象和 `Map`，`item` 是值，`index` 是键。
5. `#for` 的数据源使用 `of`，绝不使用 `in`——`in` 是 JavaScript 运算符，会使指令值产生歧义。
6. 当列表渲染的元素持有本地 DOM 状态（如输入框值）时添加 `#key`，使节点在插入/删除/重排时按标识而非索引被追踪。
7. `#await={promise}` 在等待期间渲染其标签；`#then` 在兑现时渲染，`#catch` 在拒绝时渲染。兑现/拒绝的值通过指令值中的标识符或解构接收。
8. 不需要等待 UI 时，`#await` 与 `#then` 可以放在同一标签上。
9. `#html` 将文本渲染为 HTML 片段（普通插值只会转义后更新 `textContent`）。其可选值为 `Partial<{ escapeTags: string[], escapeStyle: boolean, escapeScript: boolean }>`，用于让部分受信内容保持转义。
10. `#target` 将节点挂载到另一个父元素下（如全屏模态框）；其值为 CSS 选择器字符串或 `HTMLElement`。
11. `#scope` 将父组件的作用域属性传递给子组件根元素，使父级样式可以覆盖子组件。它可沿祖先链组合——每个 `#scope` 都会把自己的作用域属性附加到最终根元素上。
12. 当子组件根节点是 `qk:spread` 或另一个组件（没有真实 DOM 元素）时，`#scope` 会深入到第一个真实元素并附加作用域属性。
13. `qk:spread` 是指令的虚拟挂载点：不渲染任何内容，让一条指令作用于全部子节点（包括文本节点），避免无意义的包装元素。
14. 同一标签上的指令遵循优先级链；例如 `#if` + `#for` 同时使用时，`#if` 先决定是否渲染。要反转行为就嵌套：把高优先级指令放在外层标签，或用 `qk:spread` 作为外层容器。

## 约束

- 同一列表内重复的 `#key` 值触发运行时错误（键以字符串比较；每项的键在列表内必须唯一）。
- 使用 `#html` 的标签只能包含一个文本子节点；否则编译器抛出致命错误。
- `#scope` 仅可用于组件标签，且只到达子组件的根元素（不会更深，出于运行时性能）。
- `#target` 只接受 CSS 选择器字符串或 `HTMLElement`。

## 示例

`#if` / `#elif` / `#else` 条件渲染：

```qk
<lang-js>
    let language = "qk"
</lang-js>

<p #if={language === "qk"}>Qingkuai</p>
<p #elif={language === "js"}>JavaScript</p>
<p #else>Other language</p>
```

带 `#for` 与 `#key` 的列表渲染：

```qk
<lang-js>
    let users = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" }
    ]
</lang-js>

<input
    #for={user of users}
    #key={user.id}
    !value={user.name}
/>
```

`#await` / `#then` / `#catch` 异步处理：

```qk
<lang-js>
    let pms = new Promise(resolve => {
        setTimeout(() => resolve("done"), 1000)
    })
</lang-js>

<p #await={pms}>waiting...</p>
<p #then={res}>resolved: {res}</p>
<p #catch={err}>rejected: {err}</p>
```

处理不完全受信的 HTML 并带转义配置：

```qk
<lang-js>
    let htmlStr = "<strong>Qingkuai</strong>"
    const htmlDirectiveConf = {
        escapeStyle: true,
        escapeScript: true,
        escapeTags: ["link", "iframe", "form"]
    }
</lang-js>

<p #html={htmlDirectiveConf}>{htmlStr}</p>
```

指令优先级：外层 `#for` 驱动、内层 `#if` 过滤，`qk:spread` 避免包装元素：

```qk
<lang-js>
    let showList = true
    let items = [1, 2, 3]
</lang-js>

<qk:spread #for={item of items}>
    <p #if={showList}>{item}</p>
</qk:spread>
```

## 参见

- [响应性](docs://zh-cn/agent/basic/reactivity.md)
- [事件处理](docs://zh-cn/agent/basic/event-handling.md)
- [插槽](docs://zh-cn/agent/components/slots.md)
- [内置元素](docs://zh-cn/agent/misc/builtin-elements.md)
- [异步组件](docs://zh-cn/agent/components/async-components.md)
