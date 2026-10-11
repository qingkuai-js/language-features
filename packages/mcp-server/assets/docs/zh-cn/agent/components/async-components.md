---
description: "Qingkuai 异步组件：Promise 与动态导入的组件标签、#await/#then/#catch 指令渲染、动态切换，以及经 &handle 的实例访问。"
keywords: ["async component", "lazy load", "dynamic import", "#await", "#then", "code splitting", "异步组件", "懒加载"]
---

# 异步组件

异步组件只在需要时加载，减小初始打包体积。组件标签可以绑定兑现值为组件的 Promise 或动态 `import()` 的结果。两种渲染方式：直接渲染（标签绑定 Promise）与指令渲染（`#await`/`#then`/`#catch` 提供加载/失败状态）。

## 语法

| 形式 | 语法 | 含义 |
|---|---|---|
| 直接：动态导入 | `const AsyncModule = import("./AsyncModule.qk")` 然后 `<AsyncModule />` | 运行时从决议后的模块中取出组件 |
| 直接：自定义 Promise | `const AsyncPanel = new Promise(resolve => resolve(SyncPanel))` 然后 `<AsyncPanel />` | 任何兑现值为组件的 Promise 都可以 |
| 直接：异步返回 | `const CurrentView = getComponent()`，其中 `getComponent` 为异步函数 | 按条件决定加载哪个组件 |
| 指令：异步处理 | `<div #await={import("./Component.qk")}>Loading...</div>` + `<qk:spread #then={Module}><Module.default /></qk:spread>` + `<div #catch>...</div>` | 加载状态、决议后渲染、失败兜底 |
| 模块 vs 组件 | `<Module.default />`、直接使用 `<Module />`，或 `#then={{default: Component}}` 解构 | 均支持 |
| 动态切换 | `let CurrentView = import("./AsyncOne.qk")`；赋新导入即切换 | 变更时响应式重渲染 |
| 实例访问 | `<AsyncView &handle={asyncView} />` | 与普通组件一致；导出成员可访问 |

## 规则

1. 使用动态 `import()`，让构建工具把组件拆分为独立 chunk。
2. 指令渲染时，`#await` 元素放占位内容，经 `qk:spread #then` 渲染；`#catch` 分支在给出绑定时（`#catch={err}`）接收拒绝原因。
3. 把异步导入赋给 `let` 声明的变量即可在运行时切换加载的组件。
4. 异步组件标签上的 `&handle` 在加载完成后提供实例；在 `onAfterMount` 或更晚时机读取。

## 示例

动态导入的直接渲染：

```qk
<lang-js>
    import SyncPanel from "./SyncPanel.qk"

    // 手动构造一个返回导入组件的 Promise
    const AsyncPanel = new Promise(resolve => {
        setTimeout(() => {
            resolve(SyncPanel)
        }, 1000)
    })

    const AsyncModule = import("./AsyncModule.qk")
</lang-js>

<AsyncPanel />
<AsyncModule />
```

带加载与失败状态的指令渲染：

```qk
<div #await={import("./Component.qk")}>
    Loading...
</div>
<qk:spread #then={Module}>
    <Module.default />
</qk:spread>
<div #catch>Fail to load Component.qk</div>
```

按条件异步返回：

```qk
<lang-js>
    import Comp1 from "./Comp1.qk"
    import Comp2 from "./Comp2.qk"

    async function getComponent() {
        return (await isOk()) ? Comp1 : Comp2
    }
</lang-js>

<div #await={getComponent()}>Loading...</div>
<qk:spread #then={Comp}>
    <Comp />
</qk:spread>
<div #catch={err}>Error: {err}</div>
```

通过决议后的组件访问实例：

```qk
<lang-js>
    const AsyncView = import("./AsyncOne.qk")

    let asyncView

    onAfterMount(() => {
        console.log(asyncView) // logs: 异步组件实例
    })
</lang-js>

<AsyncView &handle={asyncView} />
```

## 参见

- [动态组件](docs://zh-cn/agent/components/dynamic-components.md)
- [编译指令](docs://zh-cn/agent/basic/compilation-directives.md)
- [成员导出](docs://zh-cn/agent/components/exports.md)
