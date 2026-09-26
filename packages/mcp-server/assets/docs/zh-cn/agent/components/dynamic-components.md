---
description: "Qingkuai 动态组件：变量组件标签、值变化时的自动切换、实例句柄更新，以及基于 derived 的联合类型推导。"
keywords: ["dynamic component", "component switch", "derived", "动态组件"]
---

# 动态组件

当模板中的组件标签是值会在运行时变化的标识符（或成员表达式）时，编译器将其编译为动态组件：值变化时渲染自动切换到最新组件。动态组件像普通组件一样接收属性、引用属性与插槽内容。

## 语法

| 形式 | 语法 | 含义 |
|---|---|---|
| 变量标签 | `<CurrentView />` | `CurrentView` 是持有组件的变量；切换值即切换渲染 |
| 实例句柄 | `<CurrentView &handle />` | 每次切换后句柄自动更新为最新组件实例 |
| derived 切换（TS） | `const CurrentView = derived(() => condition ? A : B)` | 编译器从返回值推导联合类型；切换逻辑通过响应式依赖追踪 |

## 规则

1. 把导入的组件赋给变量，以变量作为标签名；改变变量即切换渲染的组件。
2. 动态组件上引用属性的句柄在组件切换时自动更新；在 `await nextTick()` 之后读取新实例。
3. TypeScript 下优先使用 `derived` 而不是手动声明联合类型——编译器从函数的返回值推导联合类型。

## 示例

基础切换：

```qk
<lang-js>
    import CounterView from "./views/CounterView"
    import BadgeView from "./views/BadgeView"

    let CurrentView = CounterView

    setTimeout(() => {
        CurrentView = BadgeView
    }, 1000)
</lang-js>

<CurrentView />
```

跨切换的实例访问：

```qk
<lang-js>
    import CounterView from "./views/CounterView"
    import BadgeView from "./views/BadgeView"
    import { nextTick } from "qingkuai"

    let handle = null
    let CurrentView = CounterView

    setTimeout(async () => {
        CurrentView = BadgeView

        // 等待更新调度完成
        await nextTick()

        // BadgeView 实例
        console.log(handle)
    }, 1000)

    onAfterMount(() => {
        console.log(handle) // logs: CounterView 实例
    })
</lang-js>

<CurrentView &handle />
```

TypeScript 用 `derived` 推导联合类型：

```qk
<lang-ts>
    import CounterView from "./views/CounterView"
    import BadgeView from "./views/BadgeView"

    let condition = reactive(true)

    const CurrentView = derived(() => {
        return condition ? CounterView : BadgeView
    })
</lang-ts>

<CurrentView />
```

## 参见

- [异步组件](docs://zh-cn/agent/components/async-components.md)
- [响应性](docs://zh-cn/agent/basic/reactivity.md)
- [组件基础](docs://zh-cn/agent/components/basic.md)
