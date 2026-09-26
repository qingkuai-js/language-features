# 常见问题

本页汇总使用 Qingkuai 时的常见疑问，以及一些设计决策背后的原因。如果你对某些行为感到疑惑，可以先在这里寻找答案。

---

## 为什么监视器、副作用、上下文和生命周期是内建方法？

监视器、副作用、上下文和生命周期这类运行时 API 都与组件实例密切相关：它们依附于某个组件实例工作，并在实例卸载时被清理。不少框架的实现方式是将它们隐式绑定到“当前正在初始化的组件实例”上（例如通过 `getCurrentInstance` 获取），这种绑定依赖运行时的调用时序。一旦这些调用出现在异步逻辑中，“当前实例”是谁就变得难以预测：轻则绑定到错误的组件，重则直接抛出运行时错误，还容易伴随难以排查的内存泄漏。

Qingkuai 采用了显式绑定的思路。在组件文件中，你并不需要传入组件实例：这些 API 以[内建方法](docs://zh-cn/references/intrinsics.md)的形式提供，无需导入即可直接调用，编译器自动将其绑定到当前组件实例，并在组件卸载时自动清理：

```js
// 上下文：写入后可被本组件及后代组件读取
setContext("theme", "dark")

// 生命周期：组件挂载后执行
onAfterMount(() => {
    console.log("component mounted")
})
```

在组件文件之外（例如在全局状态模块或工具函数中注册监视器），则使用从[运行时包](docs://zh-cn/references/terminology.md#运行时包)导入的对应 API，并通过第一个参数显式传入目标实例（通常借助内建的 `instance` 标识符在组件内获取后传出）：

```js
import { watch } from "qingkuai"

export function watchUserInfo(instance, callback) {
    // 绑定关系书写在调用处，一目了然
    return watch(instance, callback)
}
```

若传入 `null`，则创建不与任何组件绑定的[全局监视器或全局副作用](docs://zh-cn/references/terminology.md#全局监视器)，生命周期需要自行管理。

无论哪种形式，每一条绑定关系都书写在调用处、可预测且符合预期，而不是依赖运行时时序去推断“当前实例”是谁；组件卸载时，被绑定的监视器、副作用与上下文数据会被安全移除并释放内存。这从机制上消除了运行时时序带来的不稳定 bug 与内存泄漏问题。更多细节请参阅[监视器与副作用的外部注册](docs://zh-cn/basic/watchers-and-side-effects.md#外部注册)。

---

## 为什么函数体内访问的标识符不会被推导为具有响应性？

如果你从其他响应式框架迁移而来，很可能写出过这样的代码：

```js
let count = 0

function setCount(v) {
    count = v
}

function getDouble() {
    return count * 2
}
```

```qk
<div>{getDouble()}</div>
<button @click={setCount}>+1</button>
```

在 Qingkuai 中，`count` 会被推导为原始值。规则本身很简单：响应性来自[在模板中被访问](docs://zh-cn/references/reactivity-infer-rules.md#在模板中访问)，而编译器不深入普通函数内部分析其访问了哪些标识符，也就是说上面的示例代码中在模板中访问的是 `getDouble`，不是 `count`。

`count` 保持为原始值意味着 `setCount` 中的赋值只是普通 JavaScript 赋值，视图不会更新。如果不确定某个标识符最终被推导成了什么，IDE 的[推导提示](docs://zh-cn/references/reactivity-infer-rules.md#推导提示)会在声明处与悬停时直接展示其响应性状态。

让这段代码按预期工作，推荐使用 `derived`/`derivedExp`。这是从已有响应式值计算新值的专用形式：当衍生值在模板中被访问时，其 `getter` 或表达式字面量中读取的标识符（含嵌套回调中的读取）也会被认作在模板中被访问（详见[访问传播](docs://zh-cn/references/reactivity-infer-rules.md#衍生值源的访问传播)），因此通常无需显式标记源：

```qk
<lang-js>
    let count = 0

    function setCount(v) {
        count = v
    }

    const double = derivedExp(count * 2)
</lang-js>

<div>{double}</div>
<button @click={setCount}>+1</button>
```
