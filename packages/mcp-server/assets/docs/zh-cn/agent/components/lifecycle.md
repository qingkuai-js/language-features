---
description: "Qingkuai 组件生命周期：onAfterMount、onBeforeDestroy、onAfterDestroy、onBeforeUpdate、onAfterUpdate —— 内建注册规则与绑定实例的外部注册。"
keywords: ["lifecycle", "onAfterMount", "onBeforeDestroy", "onBeforeUpdate", "onAfterUpdate", "生命周期"]
---

# 生命周期

生命周期方法在组件的各个阶段插入逻辑：挂载（`onAfterMount`）、卸载（`onBeforeDestroy`、`onAfterDestroy`）、更新（`onBeforeUpdate` 每次更新调度前，`onAfterUpdate` 更新调度完成后）。

## 语法

| 方法 | 触发时机 |
|---|---|
| `onAfterMount(cb)` | 组件挂载之后 |
| `onBeforeUpdate(cb)` | 每次更新调度之前（每次更新都会触发） |
| `onAfterUpdate(cb)` | 更新调度完成之后（每次更新都会触发） |
| `onBeforeDestroy(cb)` | 组件卸载之前 |
| `onAfterDestroy(cb)` | 组件卸载之后 |

没有 `onBeforeMount`：整个嵌入脚本块都在组件挂载之前运行，挂载前逻辑直接写在那里。

## 规则

1. 所有生命周期方法都是组件文件的内建方法——直接调用、无需导入；编译器将其绑定到当前组件实例。
2. 在异步逻辑（如 `setTimeout` 内）注册的回调仍然绑定到正确的组件实例。
3. 注册时对应阶段已经过去，回调永远不会触发，开发模式会发出警告——例如 `setTimeout` 内注册的 `onAfterMount` 永不触发。例外：`onBeforeUpdate`/`onAfterUpdate` 的窗口每次更新都会重现，迟到注册会在下次更新时照常触发。
4. 外部注册从 `qingkuai` 运行时包导入方法，第一个参数是目标组件实例，随后是回调。也可以把内建生命周期方法本身传给外部模块（与监视器和上下文的模式相同）。

## 示例

内建注册：

```js
onAfterMount(() => {
    console.log("component mounted")
})
```

绑定实例的外部模块：

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

    useBeforeUpdateMiddleware(instance)
</lang-js>
```

## 参见

- [监视器与副作用](docs://zh-cn/agent/basic/watchers-and-side-effects.md)
- [组件上下文](docs://zh-cn/agent/components/contexts.md)
- [内建标识符](docs://zh-cn/agent/references/intrinsics.md)
