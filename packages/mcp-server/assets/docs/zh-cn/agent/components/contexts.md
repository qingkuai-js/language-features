---
description: "Qingkuai 组件上下文：setContext/setContextGetter/setContextExp 写入、经 contexts 的原型链读取、默认值，以及绑定实例的外部上下文 API。"
keywords: ["context", "contexts", "setContext", "provide", "inject", "上下文", "跨组件"]
---

# 组件上下文

上下文提供沿组件树自上而下的通信通道：组件把数据写入自己的上下文层，所有后代直接读取——无需中间层逐层转发属性，后代也无需感知数据来自哪个祖先。相比同样能跨组件共享、但需使用方显式导入状态模块且数据流向分散在各导入点的响应性状态存储，上下文是隐式注入，适合主题、语言、当前用户这类由应用层统一提供、被大范围后代消费的数据。

## 语法

| 形式 | 语法 | 含义 |
|---|---|---|
| 写入上下文 | `setContext("theme", "dark")` | 内建方法；写入当前组件的上下文层 |
| 读取上下文 | `contexts.theme` | 内建 `contexts` 标识符；脚本与模板中均可用 |
| 响应式写入（手动 getter） | `setContext("getCount", () => count)` | 后代调用它：`contexts.getCount()` |
| 响应式写入（自动 getter） | `setContextGetter("count", () => count)` | 后代无需调用直接读取：`contexts.count` |
| 响应式写入（简写） | `setContextExp("count", count)` | 编译器把表达式包装为 getter → `setContextGetter` |
| 默认值 | `defaults({ contexts: { theme: "light" } })` | 链上不存在该键时的回退值；调用后键收窄为非可选 |
| 外部写入 | `setContext(instance, "key", value)` | 运行时包形式；实例为第一个参数 |
| 外部读取 | `getContexts(instance).theme` | 返回目标实例的上下文链头对象 |

用 `Meta` typedef（`@property {string} [contexts.theme]`）或 `interface Meta { contexts: {...} }` 声明上下文契约类型，获得属性补全。

## 规则

1. 每个组件都有自己的上下文层，其原型指向父组件的上下文层；读取沿原型链找到最近的值。
2. 本层写入的键遮蔽继承的键，且不影响父组件的值——同一契约可以在不同子树呈现不同值。
3. `setContext` 捕获写入时的值；之后对源数据的修改不会同步进上下文。需要响应式上下文时使用 `setContextGetter`/`setContextExp`。
4. 外部模块操作上下文有两种方式：把内建方法作为参数传入（已绑定实例），或从 `qingkuai` 运行时包导入 `setContext`/`setContextGetter`/`getContexts` 并以目标实例为第一个参数（内建 `instance` 标识符，或通过 `&handle` 获得的子实例）。

## 示例

祖先写入、后代读取：

```qk
<!-- Outer.qk -->
<lang-js>
    import { Inner } from "./Inner.qk"

    /**
     * @typedef {Object} Meta
     * @property {Object} contexts
     * @property {string} [contexts.theme]
     */
    setContext("theme", "dark")
</lang-js>

<Inner />
```

```qk
<!-- Inner.qk -->
<lang-js>
    console.log(contexts.theme) // logs: dark
</lang-js>

<button !class={contexts.theme}>Theme Button</button>
```

沿链的最近值遮蔽：

```qk
<!-- Middle.qk -->
<lang-js>
    // 沿原型链解析到 Outer 写入的值
    console.log(contexts.theme) // logs: dark

    // 写入同名键会遮蔽 Outer 的值
    setContext("theme", "light")
</lang-js>

<Inner />
```

`setContextExp` 的响应式上下文（普通 js）：

```js
let count = reactive(0)
setContextExp("count", count)

// 后代组件无需手动调用 getter
// contexts.count
```

外部读取子组件上下文（普通 js）：

```js
// theme.js
import { getContexts } from "qingkuai"

export function getThemeContext(instance) {
    return getContexts(instance).theme
}
```

```qk
<lang-js>
    import { getThemeContext } from "./theme"

    let child = null

    // 获取当前组件的主题上下文值
    getThemeContext(instance)

    // 获取子组件的主题上下文值
    getThemeContext(child)
</lang-js>

<Child &handle={child} />
```

## 约束

- 单层父子关系需要的数据不要用上下文——那是组件属性的职责。
- 普通 `setContext` 的值是快照而非实时绑定；后代需要观察变化时务必选用 getter 变体。
- `getContexts` 以实例为目标；它不会遍历或修改全局存储。

## 参见

- [组件属性](docs://zh-cn/agent/components/attributes.md)
- [响应性](docs://zh-cn/agent/basic/reactivity.md)
- [运行时包 API](docs://zh-cn/agent/references/api.md)
