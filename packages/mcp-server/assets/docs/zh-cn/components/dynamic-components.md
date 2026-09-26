# 动态组件

动态组件允许你在运行时根据状态切换渲染不同的组件，而非在编译时固定为某个组件标签。在 Qingkuai 中，只要模板中的组件标签是标识符或成员表达式，且其值会在运行时变化，编译器就会自动将其编译为动态组件，当表达式的值变化时，渲染结果自动切换到最新组件。动态组件可以像普通组件一样接收属性、引用属性和插槽内容。

---

## 基本语法

将导入的组件赋值给一个变量，直接在模板中使用该变量作为标签名。当变量的值发生变化时，渲染结果会自动切换到最新组件：

|js|ts|

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

```qk
<lang-ts>
    import CounterView from "./views/CounterView"
    import BadgeView from "./views/BadgeView"

    let CurrentView: typeof CounterView | typeof BadgeView = CounterView

    setTimeout(() => {
        CurrentView = BadgeView
    }, 1000)
</lang-ts>

<CurrentView />
```

---

## 实例获取

动态组件可以正常接收属性和引用属性。当组件切换时，引用属性绑定的句柄会自动更新为最新组件实例的句柄：

|js|ts|

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

```qk
<lang-ts>
    import type { ComponentInstance } from "qingkuai"

    import CounterView from "./views/CounterView"
    import BadgeView from "./views/BadgeView"
    import { nextTick } from "qingkuai"

    type DynamicView = typeof CounterView | typeof BadgeView

    let CurrentView: DynamicView = CounterView
    let handle: ComponentInstance<DynamicView> | null = null

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
</lang-ts>

<CurrentView &handle />
```

---

## 自动类型推断

配合 `TypeScript` 时，可以利用 `derived` 内建方法让编译器自动推断动态组件的联合类型，避免手动声明类型。`derived` 会包装一个返回组件的函数，编译器会根据该函数的返回值推断联合类型，切换逻辑也会被响应式依赖所追踪：

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
