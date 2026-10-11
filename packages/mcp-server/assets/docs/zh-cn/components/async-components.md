# 异步组件

在现代前端应用中，按需加载是优化加载体验与渲染性能的重要手段。异步组件（Async Component）正是为此而生的一种机制：它允许你在真正需要某个组件时再加载，而不是在初始阶段就将其打包进主应用中。这种方式不仅能有效减少初次加载体积，还能改善资源加载速度，并提升首屏渲染性能；同时也便于配合路由或条件渲染进行更高效的资源管理。

在 Qingkuai 中，渲染异步组件有两种方式：

- **直接渲染**：将异步组件直接作为组件标签使用，写法简洁；
- **指令渲染**：搭配 [异步处理](docs://zh-cn/basic/compilation-directives.md#异步处理) 指令实现，适合需要加载中状态或加载失败兜底的场景。

直接渲染时，组件标签可以直接绑定**返回组件的 [Promise](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Promise) 或[动态导入](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/import)的结果**，编译器会把组件标签统一交由运行时处理，在 Promise 解析后取出其中的组件函数进行渲染。

---

## 动态导入

很多构建工具会对 [动态导入](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/import) 的模块进行代码分割优化。对于组件，我们同样可以利用这一点，把 `import()` 返回的 Promise 直接作为组件标签：

```qk
<lang-js>
    import SyncPanel from "./SyncPanel.qk"

    // 手动构造 Promise，返回已导入的组件
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

若需要展示加载中或加载失败的状态，则需要搭配使用 [异步处理](docs://zh-cn/basic/compilation-directives.md#异步处理) 指令：

```qk
<div #await={import("./Component.qk")}>
    Loading...
</div>
<qk:spread #then={Module}>
    <Module.default />
</qk:spread>
<div #catch>Fail to load Component.qk</div>
```

这里省略 `default` 属性访问或在 `#then` 中解构出组件标识符后再使用都是支持的：

```qk
<qk:spread #then={Module}>
    <Module />
</qk:spread>
```

```qk
<qk:spread #then={{default: Component}}>
    <Component />
</qk:spread>
```

---

## 异步返回

除了直接使用动态导入，我们还可以在自定义的异步逻辑中返回组件，例如根据某个条件决定加载哪个组件：

```qk
<lang-js>
    import Comp1 from "./Comp1.qk"
    import Comp2 from "./Comp2.qk"

    async function getComponent() {
        return (await isOk()) ? Comp1 : Comp2
    }

    const CurrentView = getComponent()
</lang-js>

<CurrentView />
```

搭配异步处理指令：

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

---

## 动态切换

把异步组件赋值给 `let` 声明的响应式变量，即可在运行时动态切换组件：

```qk
<lang-js>
    let CurrentView = import("./AsyncOne.qk")

    const switchView = () => {
        CurrentView = import("./AsyncTwo.qk")
    }
</lang-js>

<CurrentView />
<button @click={switchView}>Switch</button>
```

搭配异步处理指令：

```qk
<lang-js>
    let Module = import("./AsyncOne.qk")

    const switchView = () => {
        Module = import("./AsyncTwo.qk")
    }
</lang-js>


<div #await={Module}>Loading...</div>
<qk:spread #then={View}>
    <View />
</qk:spread>
<div #catch={err}>Error: {err}</div>
<button @click={switchView}>Switch</button>
```

---

## 实例获取

与普通组件标签一样，异步组件标签同样支持 `&handle` [引用属性](docs://zh-cn/components/attributes.md#引用属性)，可以正常获取组件实例并访问其导出的成员：

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

搭配异步处理指令：

```qk
<lang-js>
    let asyncView

    onAfterMount(() => {
        console.log(asyncView) // logs: 异步组件实例
    })
</lang-js>

<div #await={import("./AsyncOne.qk")}>Loading...</div>
<qk:spread #then={{default: Component}}>
    <Component &handle={asyncView} />
</qk:spread>
```
