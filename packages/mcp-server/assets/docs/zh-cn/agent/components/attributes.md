---
description: "通过组件标签上的属性向 Qingkuai 组件传入数据、事件与可写引用。"
keywords: ["component attributes", "props", "attrs", "inherit", "组件属性", "传参"]
---

# 组件属性

组件标签上的属性向组件传入外部数据或配置。普通属性在组件内部通过内建 `props` 标识符读取（其属性是只读 getter）；可写的引用属性通过内建 `refs` 标识符读取。

## 语法

| 形式 | 父级标签语法 | 子级访问方式 | 值/类型 |
|---|---|---|---|
| 静态属性 | `msg="value"` | `props.msg` | 字符串 |
| 布尔属性（无值） | `isOk` | `props.isOk` | 布尔 `true` |
| 动态属性（简写） | `!list` | `props.list` | 任意类型；响应式 |
| 动态属性（绑定） | `!time={article.time}` | `props.time` | 任意类型；响应式 |
| 事件属性 | `@someThingHappened={console.log($arg)}` | `props.someThingHappened` | 函数；`$arg` 是触发时的参数 |
| 引用属性 | `&name={name}` | `refs.name`（可读可写） | 任意类型；写回同步到父级数据 |
| 组件实例引用 | `&handle={child}` | `child` | 组件实例 |
| 默认值 | 子级 `defaults({ refs: {...}, props: {...} })` | — | 父级未传该属性时的回退值 |

组件标签的属性名同时支持 camelCase 和 kebab-case：`<Component myAttr />` 与 `<Component my-attr />` 等价，解析为同一个 prop。`props`/`refs` 的类型用 `Meta` typedef（JSDoc）或 `<lang-ts>` 中的 `interface Meta` 声明。

## 规则

1. 除引用属性外的所有属性——包括事件——都在组件内部通过内建 `props` 标识符访问。
2. 静态属性只能传字符串；动态属性（`!` 前缀）支持更多数据类型（数组、对象、函数等）。数据源变化时，组件内部使用该属性的 DOM 会更新。
3. 属性名不带值时，组件内部接收到的是布尔值 `true`。
4. 事件属性与其他非引用属性只在语义上有差别；建议将传递给组件的回调函数按事件命名并用 `@` 前缀标记。语言服务只把函数类型的属性作为事件建议。
5. `props` 的属性本质上是只读 getter；写入需要引用属性（`&name={name}`），并通过内建 `refs` 读取。对 `refs` 属性赋值会把变更同步回外部数据并触发其响应式更新。
6. 解构 `props`/`refs` 会调用一次 getter 并产生独立的普通变量，与传入值失去联系：原始类型标识符可能被推导为具有独立的响应性（本地视图更新，外部视图不更新）；属性值为响应式的复杂类型时，属性访问仍具响应性，但对标识符重新赋值与原始类型行为一致——只更新本地视图，不同步回外部。响应式解构推荐固定搭配内建 `alias`：`let { name } = alias(refs)`、`const { userInfo } = alias(props)` —— 别名会被编译为对原始属性的访问表达式，无运行时包装开销。
7. 内建 `defaults({ refs: {...}, props: {...} })` 为父级未传的属性声明回退值；调用之后，给了默认值的键会被收窄为非可选。
8. 组件标签同时接受 `myAttr` 与 `my-attr`。默认格式化会把 kebab-case 的组件属性与事件名重写为 camelCase；`.prettierrc` 中配置 `{"qingkuai": {"componentAttributeFormatPreference": "kebab"}}` 可切换偏好（补全建议随之变化）。

## 约束

- `props` 的属性不能直接修改（只读 getter）——写入请使用引用属性。
- 修改复杂 `props` 值的内部数据（如 `props.userInfo.name = "..."`）技术上可行但不推荐；它使组件状态更难追踪与维护。
- 组件标签上的 `&handle` 保留用于接收组件实例——绝不把引用属性命名为 `handle`。
- 组件销毁时，引用属性自动将绑定变量重置为 `null`，防止悬空引用。
- 属性继承（未声明的属性透传到根元素）未在本文档中定义；不要假设它存在。

## 示例

静态、布尔、动态与事件属性：

```qk
<!-- Inner.qk -->
<lang-js>
    /**
     * @typedef {Object} Meta
     * @property {Object} props
     * @property {string} props.msg
     * @property {boolean} [props.isOk]
     * @property {string[]} props.list
     * @property {(msg: string) => void} props.someThingHappened
     */
</lang-js>

<p>{props.msg} — {props.isOk}</p>
<p>The length of list is: {props.list.length}</p>
```

```qk
<!-- Outer.qk -->
<lang-js>
    import Inner from "./Inner.qk"

    const list = ["js", "ts", "qk"]
</lang-js>

<Inner
    msg="value"
    isOk
    !list
    @someThingHappened={console.log($arg)}
/>
```

引用属性：

```qk
<!-- Inner.qk -->
<lang-js>
    /**
     * @typedef {Object} Meta
     * @property {Object} refs
     * @property {string} refs.name
     */
</lang-js>

<p>Inner name: {refs.name}</p>
<button @click={refs.name = "Qingkuai"}>Change the name</button>
```

```qk
<!-- Outer.qk -->
<lang-js>
    import Inner from "./Inner.qk"

    let name = "JavaScript"
</lang-js>

<p>Outer name: {name}</p>
<Inner &name={name} />
```

默认值：

```qk
<!-- Inner.qk -->
<lang-js>
    /**
     * @typedef {Object} Meta
     * @property {Object} props
     * @property {number} [props.age]
     * @property {string} [props.name]
     */
    defaults({
        props: {
            age: 0,
            name: "Unknown"
        }
    })
</lang-js>

<p>{props.name}: {props.age}</p>
```

```qk
<!-- Outer.qk -->
<lang-js>
    import Inner from "./Inner.qk"
</lang-js>

<!-- 两个属性都未传入；都回退到默认值 -->
<Inner />
```

## 参见

- [插槽](docs://zh-cn/agent/components/slots.md)
- [内建标识符](docs://zh-cn/agent/references/intrinsics.md)
- [事件处理](docs://zh-cn/agent/basic/event-handling.md)
