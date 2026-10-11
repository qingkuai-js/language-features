# 响应性

在前端开发中，<b>响应性（Reactivity）</b>是一种让数据状态与界面保持自动同步的机制。它的核心思想是：当数据发生变化时，界面会自动更新，无需手动操作 DOM。过去，开发者需要在业务逻辑中显式地操作页面元素以反映数据变化，这不仅繁琐，而且容易出错；而响应性系统通过“追踪依赖”和“自动更新”，极大提升了开发效率和代码可维护性。

---

## 响应性声明

在 Qingkuai 中，无需手动声明响应性变量。编译器会根据 [响应性推导规则](docs://zh-cn/references/reactivity-infer-rules.md) 为标识符附加响应式能力。下面代码中，`progress` 在脚本里从 `pending` 被修改为 `completed` 后，模板会自动完成更新，这正是响应性的简单应用：

```qk
<lang-js>
    let progress = "pending"

    setTimeout(() => {
        progress = "completed"
    }, 1000)
</lang-js>

<h1>Task status: {progress}</h1>
```

不过在某些情况下，你可能希望阻止这一默认行为。这时，可以使用内建的 `raw` 方法标记标识符无需响应性，从而避免为其添加响应式能力。例如下面这段代码中的 `progress` 变更后不会导致页面发生变化：

```qk
<lang-js>
    let progress = raw("pending")

    setTimeout(() => {
        progress = "completed"
    }, 1000)
</lang-js>

<h1>Task status: {progress}</h1>
```

> [!TIP]
> 此处的 `raw` 仅用于显式标记声明的标识符本身不具有响应性，若初始值本身具有响应性，则该值的响应性能力不会被移除；要移除初始值的响应性，可以使用 `toRaw` 方法来[获取原始值](#获取原始值)。

当然，你也可以使用内建的 `reactive` 或 `shallow` 方法主动标记其需要响应性（二者的区别见[响应性模式](#响应性模式)）：

```js
let progress = reactive("pending") // 具有响应性
```

> [!WARNING]
> 如果你只是想在脚本中单独使用响应性能力，我们并不推荐这样做。响应性系统的定位是驱动视图随数据变化自动更新，而非充当脚本内部的通用状态管理工具。在脚本中组织逻辑时，应优先采用函数组合等常规编程手段，避免过度依赖响应性机制。另一方面，响应式数据的操作本身存在一定的运行时开销，过度使用会使变更链路趋于隐式：数据流向不再直观，既不利于清晰表达执行逻辑，也会降低代码跳转与审查的效率。

---

## 响应性别名

Qingkuai 的别名绑定提供了一种简洁的响应式访问/写入能力。对于嵌套较深的属性，可以通过内建的 `alias` 方法创建一个更短的标识符别名，从而简化响应式访问代码：

```qk
<lang-js>
    let name = alias(refs.userInfo.detail.information.name)

    // name -> refs.userInfo.detail.information.name
    // 对 name 的写入具有响应性，且等价于写入 refs.userInfo.detail.information.name
    setTimeout(() => {
        name = "Unknown"
    }, 1000)
</lang-js>

<!-- name -> refs.userInfo.detail.information.name -->
<!-- 对 name 的访问具有响应性，且等价于访问 refs.userInfo.detail.information.name -->
<p>User name is: {name}</p>
```

别名绑定在表现上与其他语言中的[引用传递](https://baike.baidu.com/item/%E5%BC%95%E7%94%A8%E4%BC%A0%E9%80%92?fromModule=lemma_search-box)非常相似，但并不完全等价于传统意义上的引用传递。其实现原理是：编译器会将对别名标识符的访问和写入重写为对原始标识符的访问和写入，从而获得响应式读写能力。这一点与我们后续要介绍的[引用属性](docs://zh-cn/basic/reference-attributes.md)也有相通之处。

> [!WARNING]
> 别名能力也可以用于非响应式值，但不建议滥用。它的设计初衷是简化深层嵌套属性的响应式访问，因此建议仅在这类场景中使用。最佳实践是优先将此能力用于组件 [props](docs://zh-cn/components/attributes.md) 和 [refs](docs://zh-cn/components/attributes.md#引用属性)，其他场景请谨慎评估后再使用。

---

## 响应性模式

Qingkuai 支持两种响应性模式：深度响应性和浅层响应性。默认情况下，编译器会为所有标识符附加深度响应式能力。即使其属性是复杂类型（如对象或数组），也会被递归地添加响应性能力；而浅层响应性只会为标识符本身添加响应式能力，其属性即使是复杂类型也不会被添加响应性。

要修改默认的响应性模式，可以在当前目录或上级目录中添加 `.qingkuairc` 配置文件，修改其内容为：

```json
{
    "reactivityMode": "shallow"
}
```

> [!TIP]
> 上述配置可以搭配将 [`allowConstReactive`](docs://zh-cn/misc/config-files.md#allowconstreactive) 设置为 `false`，让应用进入一种类似于 `signal` 的、开销极低的响应式模式，详见[信号模式](docs://zh-cn/misc/optimization.md#信号模式)。

通过配置文件设置的响应性模式会对当前目录及其所有子目录生效，直到遇到另一个配置文件为止。如果想要在单一组件文件中使用不同的响应性模式，可以在嵌入脚本标签上添加 `reactive` 或 `shallow` 属性来覆盖默认设置：

```qk
<lang-js shallow>
    // 编译器推导标识符是否具有浅层响应性
</lang-js>

<lang-js reactive>
    // 编译器推导标识符是否具有深度响应性
</lang-js>
```

这两种响应性模式的核心区别在于响应性是否会沿着嵌套结构逐层传播：使用 `reactive` 标记的值，其自身及其任意层级的属性都会被递归地添加响应性能力，任何层级上的修改都能触发更新；而使用 `shallow` 标记的值只在浅层维护响应性，更深层级上的修改只是一次普通的 JS 操作，不会触发任何更新：

```js
const target = {
    count: 0,
    user: {
        name: "Alice"
    }
}
let deepState = reactive(target)
let shallowState = shallow(target)

// 重新赋值在两种模式下都具有响应性，均会触发更新
deepState = {
    count: 1,
    user: {
        name: "Bob"
    }
}
shallowState = {
    count: 1,
    user: {
        name: "Bob"
    }
}

// 深度响应性：嵌套属性的修改会触发更新
deepState.user.name = "Charlie"

// 浅层响应性：嵌套属性的修改不会触发更新
shallowState.user.name = "Charlie"
```

对于使用 `const` 声明的标识符，由于其绑定不可被重新赋值，`shallow` 会转而为第一层属性添加响应性能力；而 `reactive` 依然会递归地处理所有嵌套属性：

```js
const config = {
    api: {
        baseURL: "/api",
        timeout: 1000
    }
}
const deepConfig = reactive(config)
const shallowConfig = shallow(config)

// 两者都会触发更新：api 是第一层属性
deepConfig.api = {
    baseURL: "/api",
    timeout: 2000
}
shallowConfig.api = {
    baseURL: "/api",
    timeout: 2000
}

// 只有深度响应性会触发更新：timeout 位于第二层
deepConfig.api.timeout = 3000
shallowConfig.api.timeout = 3000
```

除了更新行为，二者在读取属性时返回的值也不同：深度响应性下读取到的属性会被包装为响应式代理对象，而浅层响应性下读取到的就是原始值本身：

```js
const target = { inner: {} }
const deepState = reactive(target)
const shallowState = shallow(target)

console.log(deepState.inner === target.inner) // logs: false
console.log(shallowState.inner === target.inner) // logs: true
```

> [!TIP]
> 深度响应性更符合直觉，但每次属性访问都需要递归地包装嵌套值，对于体量庞大或层级很深的数据结构存在一定开销。如果数据总是以整体替换的方式更新（如重新赋值整个列表），或其中包含不需要被代理的第三方对象（如类实例、DOM 对象等），可以使用 `shallow` 标记来避免不必要的深度包装；反之，如果需要监听嵌套属性的变化，就应使用 `reactive`。

---

## 获取原始值

当一个复杂类型的标识符被推导为响应性时，它的属性也会被递归地推导为响应性。这意味着当我们访问该值或其属性时，拿到的通常不是原始值，而是编译器包装后的响应式代理对象。在某些场景下，我们可能需要获取原始值来进行比较或其他操作，此时可以使用 `qingkuai` 包中导出的 `toRaw` 方法：

```js
import { toRaw } from "qingkuai"

const inner = {}
const outer = reactive({ inner })
console.log(outer.inner === inner) // logs: false
console.log(toRaw(outer.inner) === inner) // logs: true
console.log(toRaw(outer).inner === inner) // logs: true
```

---

## 获取响应式值

Qingkuai 还提供了 `toReactive` 和 `toShallow` 方法，用于获取某个值对应的响应式代理对象：

```js
import { toReactive } from "qingkuai"

const obj = { count: 0 }
const reactiveObj = toReactive(obj)
```

> [!WARNING]
> 需要注意，`toReactive` 并不会为传入值新增响应式能力，它只负责返回该值的响应式代理对象。因此，如果传入值本身未被编译器推导或明确标记为响应式，那么通过 `toReactive` 获取到的代理对象同样不具备响应式能力。

---

## 衍生响应式状态

衍生响应式状态是指依赖其他响应性值的运算过程。当这些被依赖的响应性值发生变化时，相关运算会在下次读取该衍生状态时重新执行，以返回最新结果。在 Qingkuai 中，我们通过内建方法 `derived` 或 `derivedExp` 来声明衍生响应式状态：

```js
let number = 10
const double = derived(() => number * 2)
```

与 `derived` 方法不同，`derivedExp` 方法允许我们直接传入一个表达式来声明衍生响应式状态，对于一些简单的计算逻辑，这种方式会更简洁：

```js
const double = derivedExp(number * 2)
```

实际开发中，我们常常需要在模板的插值块中编写 JS/TS 表达式，其中不乏较为复杂的逻辑。如果模板中充斥大量复杂表达式，往往会导致代码混乱、可读性下降。此时，使用衍生响应式状态来提取和表示这些复杂表达式，会是一个更清晰、高效的做法：

```qk
<lang-js>
    const result = derived(() => {
        const normalized = number < 0 ? Math.abs(number) : number
        return normalized * 2
    })
</lang-js>

<p>the calculation result is: {result}</p>
```

---

## 非响应式读取

在模板[插值块](docs://zh-cn/basic/interpolation.md)或[监视器与副作用](docs://zh-cn/basic/watchers-and-side-effects.md)中读取响应性值时，读取行为默认会建立依赖。如果只想读取当前值，而不希望该值的变化触发重新求值，就需要**非响应式读取**，即在求值期间暂停依赖追踪。这可以借助[运行时 API](docs://zh-cn/references/api.md#运行时包) `noTracking` 实现，它会在执行传入的函数期间暂停依赖追踪：

```js
import { noTracking } from "qingkuai"

let count = reactive(0)
let message = reactive("hello")

// message 更新时不会触发 summary 重新求值
const summary = derived(() => {
    return count + noTracking(() => message)
})
```

注意，`noTracking` 只暂停依赖追踪，并不会改变求值结果的类型。如果后续需要访问其返回值的属性，可能还是会建立依赖：

```js
import { noTracking } from "qingkuai"

let user = reactive({ name: "Qingkuai" })

// user 更新时不会触发 summary 重新求值
// user.name 更新时会触发 summary 重新求值
const summary = derived(() => {
    return noTracking(() => user).name
})
```

如果希望在非响应式读取时获取原始值，可以结合 `toRaw` 方法使用：

```js
import { noTracking, toRaw } from "qingkuai"

let count = reactive(0)
let user = reactive({ name: "Qingkuai" })

// user 更新时不会触发 summary 重新求值
// user.name 更新时不会触发 summary 重新求值
const summary = derived(() => {
    return count + noTracking(() => toRaw(user)).name
})
```

上面示例中的写法虽然可以达到目的，但编写起来还是有些繁琐。此时可以用内建方法`raw` 来达到相同的目的，它除了能够用于标记[响应性声明](#响应性声明)外，还能用于**非响应式读取**：

```js
import { noTracking, toRaw } from "qingkuai"

let count = reactive(0)
let user = reactive({ name: "Qingkuai" })

// user 更新时不会触发 summary 重新求值
// user.name 更新时不会触发 summary 重新求值
const summary = derivedExp(count + raw(user).name)
```

非响应式读取并非“冻结”，被 `raw` 包裹的读取不建立依赖，其值的变化不会触发重新求值；但当同一表达式中其他被追踪的依赖发生变化而触发重新求值时，非响应式读取的部分也会被重新执行并得到最新值。观察下面示例中 `result` 的求值结果：

```js
let count = reactive(0)
let factor = reactive(1)

// count 的读取建立依赖；factor 通过 raw 读取，不建立依赖
const result = derivedExp(count + raw(factor))

// 不会导致 result 重新运算
factor = 100

// 下次读取 result 时会重新运算，得到 110
// 说明 raw 部分读取的是 factor 的最新值
count = 10
```

在渲染层面，`raw` 读取不会创建渲染副作用，仅在初始渲染时求值一次，之后依赖变化不会触发更新：

```qk
<lang-js>
    let config = loadConfig()
    let visible = reactive(true)
</lang-js>

<!-- 不创建渲染副作用，仅在初始渲染时求值一次 -->
<p>{raw(config.detail)}</p>
```

但当其所在的[条件渲染](docs://zh-cn/basic/compilation-directives.md#条件渲染)或[列表渲染](docs://zh-cn/basic/compilation-directives.md#列表渲染)重新渲染时，其中的非响应式读取也会以当前值重新求值：

```qk
<!-- visible 的变化导致重新渲染时 config 会被重新求值 -->
<p #if={visible}>{raw(config.detail)}</p>
```

> [!TIP]
> 这里的 [#if](docs://zh-cn/basic/compilation-directives.md#条件渲染) 是一个[编译指令](docs://zh-cn/basic/compilation-directives.md)，我们会在后续章节中进行介绍。它的作用是根据指令值中的条件控制元素的渲染与否。

---

## 响应性状态存储

很多时候，我们不只需要在组件内部声明响应性变量，还需要在组件外部声明，甚至需要在多个组件之间共享它们。此时可以使用 `qingkuai` 的响应性状态存储 API 在外部创建并导出响应性变量：

```js
// store.js
import { createStore } from "qingkuai"

export const store = createStore({
    isLogin: false,
    userInfo: null
    // other properties ...
})
```

在多个组件中分别导入它，即可共享响应性状态：

```qk
<!-- Header.qk -->
<lang-js>
    import { store } from "./store"

    function handleLogin(){
        /* ... */
    }
</lang-js>

<header>
    <button
        #if={!store.isLogin}
        @click={handleLogin}
    >
        Login
    </button>
    <p #else>Hello {store.userInfo.name}</p>
</header>
```

```qk
<!-- UserCard.qk -->
<lang-js>
    import { store } from "./store"
</lang-js>

<qk:spread #if={store.isLogin}>
    <p>{store.userInfo.name}</p>
    <p>{store.userInfo.gender}</p>
</qk:spread>
```

> [!TIP]
> 这里使用到的 [#if](docs://zh-cn/basic/compilation-directives.md#条件渲染) 是一个[编译指令](docs://zh-cn/basic/compilation-directives.md)，我们会在后续章节中进行介绍。它的作用是根据条件控制元素的渲染与否，在上方示例中我们通过它来实现了登录状态的条件渲染。

---

## 解构响应性声明

当我们需要从一个响应性对象中提取多个属性时，通常会使用解构赋值的语法来简化代码。在 Qingkuai 中，如果你想要解构一个响应性对象，并且希望解构后的变量也具有响应性能力，那么你可以直接使用 JavaScript 的解构赋值语法，编译器会自动为解构后的变量添加响应性能力：

```js
// 交由编译器推导的解构响应性声明
const { code, msg } = obj
const [start, end] = range

// 主动标记的解构响应性声明
const { code, msg } = reactive(obj)
const [start, end] = derivedExp(range.map(Math.ceil))
```

此外，`alias` 方法同样支持解构语法：

```js
const { code, msg } = alias(refs.response)
```
