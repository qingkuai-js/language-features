# 生命周期

在组件化开发中，生命周期是理解组件行为、把握执行时机的关键。每个组件从创建、挂载、更新到卸载，都会经历一系列生命周期阶段。为了更好地控制这些过程，Qingkuai 提供了多个生命周期方法。通过这些方法，你可以在合适的时机插入逻辑，实现数据初始化、事件绑定、清理操作等功能，使组件更健壮，也更易于维护：

- 挂载：`onAfterMount`（组件挂载完成后）；
- 卸载：`onBeforeDestroy`（组件卸载前）、`onAfterDestroy`（组件卸载完成后）；
- 更新：`onBeforeUpdate`（每次更新调度前触发）、`onAfterUpdate`（更新调度结束后触发）；

---

## 注册回调

生命周期方法是组件文件的[内建方法](docs://zh-cn/references/terminology.md#内建方法)，无需导入即可直接调用。编译器会自动将这些调用绑定到当前组件实例，回调只在所属组件的生命周期阶段触发：

```js
onAfterMount(() => {
    console.log("组件挂载完毕")
})
```

由于生命周期方法与当前组件实例绑定，即使回调是在异步逻辑中注册的，也会绑定到正确的组件实例：

```js
setTimeout(() => {
    onBeforeDestroy(() => {
        // 组件卸载前触发，即使注册发生在异步逻辑中
        console.log("组件即将销毁")
    })
}, 1000)
```

> [!TIP]
> Qingkuai 中不存在名为 `onBeforeMount` 的生命周期方法，因为整个嵌入脚本块会在组件挂载前执行，直接在其中编写组件挂载前的逻辑即可。

> [!WARNING]
> 若注册时对应的阶段已经过去，回调将不会被执行。例如在 `setTimeout` 中注册 `onAfterMount`，此时组件早已挂载完成，该回调永远不会触发，开发模式下控制台会收到相应的警告。而 `onBeforeUpdate` / `onAfterUpdate` 的窗口会在每次更新时重复出现，迟到的注册会在下一次更新时正常触发。

---

## 在组件外部注册

如果你想在组件外部封装生命周期逻辑（例如组合式工具函数），可以从 `qingkuai` [运行时包](docs://zh-cn/references/terminology.md#运行时包)导入这些方法。此时它们与组件文件中的内建方法不同：第一个参数需要显式传入目标[组件实例](docs://zh-cn/references/terminology.md#组件实例)，回调会注册到该实例上：

```js
// util.js
import { onBeforeUpdate } from "qingkuai"

export function useBeforeUpdateMiddleware(instance) {
    onBeforeUpdate(instance, () => {
        console.log("before update")
    })
}
```

```qk
<lang-js>
    import { useBeforeUpdateMiddleware } from "./util"

    // instance 为内建标识符，指向当前组件实例
    useBeforeUpdateMiddleware(instance)
</lang-js>
```

> [!TIP]
> 除了传入组件实例，也可以将内建的生命周期方法直接作为参数传给外部模块，由外部模块调用它们来注册与当前组件绑定的回调。这种模式与[监视器与副作用](docs://zh-cn/basic/watchers-and-side-effects.md#外部注册)和[上下文](docs://zh-cn/components/contexts.md#在组件外部使用)的外部使用方式相似。
