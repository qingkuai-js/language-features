# 监视器与副作用

监视器与副作用 API 是 Qingkuai 响应性系统的一部分，允许你在更新调度器的不同阶段注册回调，以便在响应式值发生变化时执行相应逻辑。根据触发时机的不同，这些 API 分为以下几类：

- `watch`、`effect`：普通注册，与更新调度器之间的执行顺序不确定，先注册先触发；
- `syncWatch`、`syncEffect`：被依赖的响应式值发生变化后立即触发，优先于（异步的）更新调度器执行；
- `preWatch`、`preEffect`：优先于更新调度器执行，适用于需要在状态变更后、更新调度前执行的逻辑；
- `postWatch`、`postEffect`：在更新调度完成后触发，适用于需要等待状态稳定或 DOM 更新之后的处理逻辑；

在[组件文件](docs://zh-cn/references/terminology.md#组件文件)内部，监视器与副作用 API 都是[内建方法](docs://zh-cn/references/terminology.md#内建方法)，无需从[运行时包](docs://zh-cn/references/terminology.md#运行时包)导入。编译器会按需为 API 调用生成与[组件](docs://zh-cn/components/basic.md)绑定的方法，使组件内注册的监视器与副作用都能正确绑定到[组件实例](docs://zh-cn/references/terminology.md#组件实例)。因此，无论是否在异步逻辑中注册，它们都会在组件卸载时被自动停止并释放内存，你无需关心内存泄漏问题。

> [!WARNING]
> 监视器与副作用 API 主要面向熟悉 [Vue](https://cn.vuejs.org) 等框架的开发者，作为迁移阶段的过渡工具，用于降低上手门槛。我们不建议在正式项目中大范围使用这类 API。原因在于，副作用通常以回调形式注册，其触发位置不会直接体现在调用栈中，调用链不够直观、跟踪成本也更高；同时，这种模式也不利于借助 IDE 的跳转、查找引用等语言服务进行高效的代码审查与维护。若项目对可维护性和可读性要求较高，建议优先采用显式数据流与函数组合来组织响应逻辑。

---

## 监视器

下面的示例为 `name` 变量注册了一个监视器，当该变量的值被修改时，回调方法将被调用。回调接受两个参数：修改前的值和当前值。由于监视器的注册时机早于模板渲染副作用，因此在回调中访问到的 DOM 仍是更新前的状态：

|js|ts|

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

```qk
<lang-ts>
    let name = "JavaScript"
    let paragraph!: HTMLParagraphElement
    watch(
        () => name,
        (pre, cur) => {
            console.log(pre, cur) // logs: JavaScript Qingkuai
            console.log(paragraph.textContent) // logs: name is: Javascript
        }
    )
</lang-ts>

<p &handle={paragraph}>name is: {name}</p>
<button @click={name = "Qingkuai"}>Change Name</button>
```

### 前置监视器

在嵌入语言标签中通过 `watch` 同步注册的监视器会优先于模板渲染副作用注册，其回调在模板更新前触发。但若监视器是在异步逻辑中注册的，则无法保证这一顺序，此时可改用 `preWatch` 以确保回调在模板更新前触发：

|js|ts|

```qk
<lang-js>
    let paragraph
    let name = "JavaScript"
    preWatch(
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

```qk
<lang-ts>
    let name = "JavaScript"
    let paragraph!: HTMLParagraphElement
    preWatch(
        () => name,
        (pre, cur) => {
            console.log(pre, cur) // logs: JavaScript Qingkuai
            console.log(paragraph.textContent) // logs: name is: Javascript
        }
    )
</lang-ts>

<p &handle={paragraph}>name is: {name}</p>
<button @click={name = "Qingkuai"}>Change Name</button>
```

### 后置监视器

与前置监视器相反，后置监视器会在更新调度完成后触发，适用于需要等待状态稳定或 DOM 更新之后的处理逻辑：

|js|ts|

```qk
<lang-js>
    let paragraph
    let name = "JavaScript"
    postWatch(
        () => name,
        (pre, cur) => {
            console.log(pre, cur) // logs: JavaScript Qingkuai
            console.log(paragraph.textContent) // logs: name is: QingKuai
        }
    )
</lang-js>

<p &handle={paragraph}>name is: {name}</p>
<button @click={name = "Qingkuai"}>Change Name</button>
```

```qk
<lang-ts>
    let name = "JavaScript"
    let paragraph!: HTMLParagraphElement
    postWatch(
        () => name,
        (pre, cur) => {
            console.log(pre, cur) // logs: JavaScript Qingkuai
            console.log(paragraph.textContent) // logs: name is: QingKuai
        }
    )
</lang-ts>

<p &handle={paragraph}>name is: {name}</p>
<button @click={name = "Qingkuai"}>Change Name</button>
```

### 同步监视器

`watch`、`preWatch` 和 `postWatch` 的回调均为异步触发。若需要同步触发，可以使用 `syncWatch`：

```qk
<lang-js>
    let name = "JavaScript"

    function handleChangeName() {
        name = "Qingkuai" // logs: Javascript QingKuai
    }

    syncWatch(
        () => name,
        (pre, cur) => {
            console.log(pre, cur)
        }
    )
</lang-js>

<p>name is: {name}</p>
<button @click={handleChangeName}>Change Name</button>
```

### 便捷注册

标准监视器注册时，第一个参数必须是返回被监听值的 `getter` 函数，对于简单表达式而言略显冗长。为此，Qingkuai 提供了一组与 [derivedExp](docs://zh-cn/basic/reactivity.md#衍生响应式状态) 作用类似的便捷注册方法：`watchExp`、`preWatchExp`、`postWatchExp`、`syncWatchExp`。这些方法的第一个参数会被编译器自动转换为 `getter` 函数，可以直接传入表达式：

```js
// 普通注册
watchExp(identifier, (pre, cur) => {
    console.log(pre, cur)
})

// 注册前置监视器
preWatchExp(identifier, (pre, cur) => {
    console.log(pre, cur)
})

// 注册后置监视器
postWatchExp(identifier, (pre, cur) => {
    console.log(pre, cur)
})

// 注册同步监视器
syncWatchExp(identifier, (pre, cur) => {
    console.log(pre, cur)
})
```

---

## 副作用

与监视器不同，`effect` 只接受一个回调函数，依赖追踪与响应逻辑合二为一：回调执行时访问到的响应式值会被自动收集为依赖，任意一个依赖发生变化时该回调都会重新执行。下面的示例中，`effect` 的回调访问了 `userId`，因此每当 `userId` 变化时都会重新发起网络请求并更新用户信息：

|js|ts|

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

```qk
<lang-ts>
    interface UserInfo {
        id: number
        name: string
    }

    let userId = 0
    let userInfo: UserInfo | null = null
    effect(async () => {
        const response = await fetch(`https://example.com/user/info/${userId}`)
        userInfo = await response.json()
    })
</lang-ts>

<qk:spread #if={userInfo}>
    <p>User id: {userInfo.id}</p>
    <p>User name: {userInfo.name}</p>
</qk:spread>
```

`effect` 同样是组件文件的内建方法，无需导入即可直接调用。副作用 API 同样提供了对应不同触发时机的注册方法：

```js
preEffect(() => {})
postEffect(() => {})
syncEffect(() => {})
```

---

## 外部注册

有时你可能希望在组件文件之外注册监视器或副作用，例如在独立的外部模块中组织响应式逻辑。有两种方式可以达到这一目的：

- 将组件内建的监视器/副作用方法作为参数传给外部模块，由外部模块调用它们来注册与当前组件实例绑定的监视器或副作用
- 从[运行时包](docs://zh-cn/references/terminology.md#运行时包)导入监视器与副作用 API，并通过第一个参数指定绑定关系：传入[组件实例](docs://zh-cn/references/terminology.md#组件实例)时行为与内建方法一致；传入 `null` 时则创建不与任何组件绑定的[全局监视器](docs://zh-cn/references/terminology.md#全局监视器)或[全局副作用](docs://zh-cn/references/terminology.md#全局副作用)

### 传递内建方法

由于组件的内建方法已经与当前组件实例绑定，所以把它们作为参数传递给外部模块可以很方便地创建与当前组件实例绑定的监视器或副作用：

|js|ts|

```js
// util.js
export function createEffect(effect) {
    effect(() => {
        // ...
    })
}
```

```ts
// util.ts
import type { BoundEffectFunc } from "qingkuai"

export function createEffect(effect: BoundEffectFunc) {
    effect(() => {
        // ...
    })
}
```

组件内调用外部模块的副作用注册方法，并将内建的 `effect` 方法作为参数传入：

```qk
<lang-js>
    import { createEffect } from "./util"

    createEffect(effect)
</lang-js>
```

### 从运行时包导入

如本节开头所述，从运行时包导入的监视器与副作用 API 通过第一个参数指定绑定关系，其余用法与组件内建方法完全一致。相比内建方法，它的优势在于可以动态指定绑定目标：

```js
import { preWatch, getCurrentInstance } from "qingkuai"

const watchHandle = preWatch(
    getCurrentInstance(),
    () => count,
    (pre, cur) => {
        // ...
    }
)
```

上面的示例中，我们在外部模块中通过 `getCurrentInstance` 获取当前组件实例，并将其作为第一个参数传给 `preWatch`，从而创建了一个与当前组件绑定的前置监视器。但这种方式有一个潜在问题：`getCurrentInstance` 只能在组件初始化或更新阶段的同步执行过程中返回正确的实例，异步逻辑中的返回结果难以预测，因此更好的做法是让外部模块接受组件实例作为参数，由组件将内建的 `instance` 标识符传入：

|js|ts|

```js
// util.js
import { preWatch } from "qingkuai"

export function createPreWatch(instance) {
    preWatch(
        instance,
        () => count,
        (pre, cur) => {
            // ...
        }
    )
}
```

```ts
import type { ComponentInstance } from "qingkuai"

import { preWatch } from "qingkuai"

export function createPreWatch(instance: ComponentInstance<any>) {
    preWatch(
        instance,
        () => count,
        (pre, cur) => {
            // ...
        }
    )
}
```

```qk
<lang-js>
    import { createPreWatch } from "./util"

    createPreWatch(instance)
</lang-js>
```

将 `null` 作为第一个参数传入时，创建的就是[全局监视器](docs://zh-cn/references/terminology.md#全局监视器)或[全局副作用](docs://zh-cn/references/terminology.md#全局副作用)：它们不与任何组件实例绑定，也不会[自动清理](#自动清理)，生命周期需要手动管理，通常用于全局状态管理、全局事件监听等场景：

```js
import { effect } from "qingkuai"

const handle = effect(null, () => {
    // ...
})

// 不要忘记在适当时机手动清理
handle.stop()
```

需要特别注意的是，我们**极不推荐**在组件内注册全局监视器或全局副作用，更合理的做法通常是在组件外部的模块中注册。如果确有必要在组件内注册，可以从运行时包导入相关 API，并将第一个参数传入 `null`，创建一个需要手动管理的监视器或副作用：

```qk
<lang-js>
    import { effect as manualEffect } from "qingkuai"

    const handle = manualEffect(null, () => {
        // ...
    })

    handle.stop()
</lang-js>
```

> [!WARNING]
> 这里必须为导入的 API 取别名（如 `manualEffect`）。因为组件文件内部已经内建了同名 API，直接导入同名标识符会触发编译错误。这一限制是刻意设计的：我们希望通过这种略显不便的使用方式，提醒你正在使用一种不被推荐的反模式。

---

## 清理监视器与副作用

### 自动清理

组件文件中使用[内建方法](docs://zh-cn/references/terminology.md#内建方法)创建的监视器或副作用，无论同步还是异步注册，都会随组件销毁自动清理，无需手动管理。但外部模块从 `qingkuai` 运行时包导入使用这些 API 时，则需要根据传入的第一个参数决定其清理方式（见上方的[从运行时包导入](#从运行时包导入)）。

### 手动清理

监视器及副作用 API 的注册方法都会返回控制句柄对象，这个句柄对象的类型定义如下：

```ts
type EffectHandle = Record<"stop" | "pause" | "resume", () => void>
```

其中的三个方法分别用于停止、暂停和恢复监视器或副作用的触发：

```js
const effectHandlers = effect(() => {
    // effect logic ...
})
effectHandlers.stop() // 停止并清理副作用
effectHandlers.pause() // 暂停副作用
effectHandlers.resume() // 恢复被暂停的副作用

const watchHandlers = watchExp(identifier, (pre, cur) => {
    // watch logic ...
})
watchHandlers.stop() // 停止并清理监视器
watchHandlers.pause() // 暂停监视器
watchHandlers.resume() // 恢复被暂停的监视器
```

### 清理函数

某些情况下，监视器或副作用在重新触发前需要执行清理逻辑。例如，若其中注册了定时器，就需要在下一次触发前将其清除，以避免内存泄漏或逻辑错误。此时可以将清理逻辑封装为函数，并在回调中通过 `return` 语句返回：

|js|ts|

```js
let timer

watchExp(identifier, (pre, cur) => {
    timer = setTimeout(() => {
        // do something ...
    }, 1000)

    return () => clearTimeout(timer) // 监视器重新触发前会先执行这个清理函数
})
```

```ts
let timer: number

watchExp(identifier, (pre, cur) => {
    timer = window.setTimeout(() => {
        // do something ...
    }, 1000)

    return () => clearTimeout(timer) // 监视器重新触发前会先执行这个清理函数
})
```

### 被动清理

若监视器或副作用回调执行期间未收集到任何响应式依赖，运行时会发出警告并自动销毁该注册项。由于它永远不会再次执行，销毁后其占用的内存等资源都会被释放：

```qk
<lang-js>
    effect(() => {
        // 回调中没有访问任何响应式值
        console.log("没有依赖，执行完后会被销毁")
    })

    watch(
        () => "constant",
        (pre, cur) => {
            // getter 返回常量，未建立响应式关联
            console.log("同样会被销毁")
        }
    )
</lang-js>
```

这通常意味着回调中没有读取响应式值，或读取路径被条件分支短路：

```qk
<lang-js>
    let flag = true
    let value = reactive("hello")

    effect(() => {
        // 当 flag 为 true 时未读取任何响应式值
        if (flag) {
            console.log("no reactive deps")
            return
        }
        console.log(value)
    })
</lang-js>
```
