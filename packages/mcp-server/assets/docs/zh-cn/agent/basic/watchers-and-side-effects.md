---
description: "Qingkuai 监视器与副作用：四种触发时机的 watch/effect 家族、*Exp 简写注册、绑定实例的外部注册方式，以及清理语义。"
keywords: ["watch", "effect", "preWatch", "postWatch", "syncWatch", "watcher", "side effect", "cleanup", "监视器", "副作用"]
---

# 监视器与副作用

监视器与副作用 API 在更新调度器的不同阶段注册回调。在组件文件内它们都是内建方法，绝不导入；编译器将其绑定到组件实例，卸载时自动清理。

## 语法

| API | 触发时机 | 回调 |
|---|---|---|
| `watch(getter, cb)` | 普通时机：相对更新调度器的顺序不保证；先注册先运行 | `(pre, cur)`，即旧值与新值 |
| `effect(cb)` | 普通时机 | 无参数；回调内读取的响应式值被自动收集为依赖 |
| `preWatch(getter, cb)` / `preEffect(cb)` | 更新调度器之前、模板更新之前 | 形态同上 |
| `postWatch(getter, cb)` / `postEffect(cb)` | 调度更新完成后（状态与 DOM 已稳定） | 形态同上 |
| `syncWatch(getter, cb)` / `syncEffect(cb)` | 依赖值变化后立即同步运行，在调度器之前 | 形态同上 |
| `watchExp(expr, cb)` / `preWatchExp` / `postWatchExp` / `syncWatchExp` | 与对应的 `watch` 系列时机相同 | 简写：编译器把第一个参数包装为 getter，直接传表达式即可 |

注册调用返回控制句柄：`type EffectHandle = Record<"stop" | "pause" | "resume", () => void>`，三个方法分别用于停止、暂停和恢复触发。

## 规则

1. `watch` 第一个参数必须是 getter；`effect` 只接受回调，把依赖收集与响应式逻辑合为一体。
2. 在模板渲染副作用之前同步注册的 `watch`，其回调在模板更新前运行；注册发生在异步逻辑中时该顺序不再保证，此时用 `preWatch` 保证"更新之前"执行。
3. 从监视器/副作用回调中返回清理函数；它会在回调下次触发前运行（例如清除定时器）。
4. 回调未收集到任何响应式依赖（getter 返回常量，或读取路径被条件分支短路）时，运行时会发出警告并自动销毁该注册。
5. 内建注册在组件销毁时自动清理，无论注册发生在同步还是异步逻辑。无需手动管理，无内存泄漏。
6. 优先使用显式数据流和函数组合，而不是大量使用监视器/副作用；这些 API 主要是给来自其他框架的开发者的过渡工具，过度使用会损害可维护性。

## 外部注册

在组件文件之外注册的两种方式：

- 把组件的内建方法作为参数传给外部模块；创建的监视器/副作用保持绑定到该实例。
- 从 `qingkuai` 运行时包导入 API，并把绑定目标作为第一个参数传入：传组件实例等同于内建方法；传 `null` 创建全局监视器/副作用，它们不会被自动清理，必须手动 `stop()`。

运行时包的 `getCurrentInstance()` 只在组件同步初始化/更新阶段返回正确实例。在异步逻辑中结果不可预测。更好的做法是让外部模块以参数接收实例，由组件传入内建 `instance` 标识符。

## 约束

- 组件文件内绝不导入 `watch`/`effect`（及各变体），它们是内建的；导入同名标识符是编译错误。
- 要在组件内注册手动管理的全局副作用，需对导入起别名（如 `import { effect as manualEffect } from "qingkuai"`）并以 `null` 为第一参数；强烈不建议：全局监视器/副作用应注册在组件之外的模块中。
- 全局监视器/副作用（`null` 绑定）永远不会被自动清理；务必保留句柄并调用 `stop()`。

## 示例

监视器携带旧值/新值；回调内 DOM 仍是更新前的状态：

```qk
<lang-js>
    let paragraph
    let name = "JavaScript"
    watch(
        () => name,
        (pre, cur) => {
            console.log(pre, cur) // logs: JavaScript Qingkuai
            console.log(paragraph.textContent) // logs: name is: Javascript
        }
    )
</lang-js>

<p &handle={paragraph}>name is: {name}</p>
<button @click={name = "Qingkuai"}>Change Name</button>
```

后置监视器读到稳定后的 DOM：

```qk
<lang-js>
    let paragraph
    let name = "JavaScript"
    postWatch(
        () => name,
        (pre, cur) => {
            console.log(paragraph.textContent) // logs: name is: QingKuai
        }
    )
</lang-js>

<p &handle={paragraph}>name is: {name}</p>
<button @click={name = "Qingkuai"}>Change Name</button>
```

自动依赖收集的副作用：

```qk
<lang-js>
    let userId = 0
    let userInfo = null
    effect(async () => {
        const response = await fetch(`https://example.com/user/info/${userId}`)
        userInfo = await response.json()
    })
</lang-js>

<qk:spread #if={userInfo}>
    <p>User id: {userInfo.id}</p>
    <p>User name: {userInfo.name}</p>
</qk:spread>
```

从回调返回清理函数（普通 js 模块）：

```js
let timer

watchExp(identifier, (pre, cur) => {
    timer = setTimeout(() => {}, 1000)
    return () => clearTimeout(timer) // 在监视器下次触发前运行
})
```

手动管理生命周期的全局副作用（普通 js 模块）：

```js
import { effect } from "qingkuai"

const handle = effect(null, () => {})
handle.stop()
```

## 参见

- [响应性](docs://zh-cn/agent/basic/reactivity.md)
- [内建标识符](docs://zh-cn/agent/references/intrinsics.md)
- [运行时包 API](docs://zh-cn/agent/references/api.md)
