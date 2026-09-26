---
description: "Qingkuai 响应性 API 与声明形式：编译器推导的响应性、显式 raw/reactive/shallow 标记、衍生状态（derived / derivedExp）、别名绑定、响应性模式、非响应式读取（noTracking / raw），以及 toRaw/toReactive/createStore 工具。"
keywords: ["reactivity", "reactive", "shallow", "raw", "derived", "derivedExp", "noTracking", "响应性", "衍生", "非响应式读取"]
---

# 响应性

## 语法

`raw`、`reactive`、`shallow`、`derived`、`derivedExp`、`alias` 是内建方法；转换与存储工具从 `qingkuai` 导入。

| API | 调用形式 | 效果 |
| --- | --- | --- |
| `raw` | 变量初始化器中的 `raw(value)` | 显式标记：标识符为静态值，不附加响应式能力 |
| `reactive` | 变量初始化器中的 `reactive(value)` | 显式标记：标识符为深响应式 |
| `shallow` | 变量初始化器中的 `shallow(value)` | 显式标记：标识符为浅响应式；仅标识符本身是响应式的，复杂类型属性不会被附加响应式能力 |
| `derived` | `derived(() => expr)` | 以函数声明衍生响应式状态 |
| `derivedExp` | `derivedExp(expr)` | 直接以表达式声明衍生响应式状态 |
| `alias` | `alias(target)` | 别名绑定：对别名标识符的读写会被重写为对原始目标的读写，提供响应式访问 |
| `toRaw` | `import { toRaw } from "qingkuai"` 后 `toRaw(value)` | 返回响应式代理对象背后的原始值 |
| `toReactive` | `import { toReactive } from "qingkuai"` 后 `toReactive(value)` | 返回该值的响应式代理对象 |
| `toShallow` | `import { toShallow } from "qingkuai"` 后 `toShallow(value)` | 返回该值的浅响应式代理对象 |
| `noTracking` | `import { noTracking } from "qingkuai"` 后 `noTracking(fn)` | 非响应式读取：在执行传入函数期间暂停依赖追踪 |
| `createStore` | `import { createStore } from "qingkuai"` 后 `createStore({ ... })` | 创建响应式状态存储，可在组件外使用并被多个组件共享 |

组件级响应性模式覆盖：在嵌入脚本标签上加 `reactive` 或 `shallow` 属性——`<lang-js reactive>`（深）或 `<lang-js shallow>`。

## 规则

1. 无需手动声明：编译器按响应性推导规则为标识符附加响应式能力；响应式数据变化时界面自动更新，无需手动 DOM 操作。
2. 显式标记（变量初始化器中的 `raw`、`reactive`、`shallow`）优先于隐式推导。未在模板中访问的标识符会被推导为 raw；若它们必须保留响应式能力，用 `reactive` 或 `shallow` 显式标记。
3. 默认响应性模式为深响应性：复杂类型的属性会被递归附加响应式能力。浅响应性下只有标识符本身是响应式的。模式可通过 `.qingkuairc` 全局设置 `"reactivityMode": "shallow"`（对该目录及全部子目录生效，直到遇到另一个配置文件），并可在组件内用脚本标签属性覆盖。
4. 衍生响应式状态在其响应式依赖变化后，于下次读取该衍生状态时重新求值；优先使用它而不是在模板插值块内写复杂表达式。声明方式：`derived(() => ...)` 或 `derivedExp(expr)`。
5. `alias` 简化对深层嵌套属性的响应式访问（最好与组件 props 和 refs 配合使用）：编译器将对别名标识符的读写重写为对原始目标的读写。
6. 对响应式对象做普通 JavaScript 解构仍能保持解构变量的响应式能力，编译器会自动处理；`alias` 也支持解构。
7. `createStore` 在组件外声明响应式状态；多个组件导入同一存储即共享同一份响应式状态。
8. 非响应式读取：在模板插值块或监视器与副作用中读取响应性值时，读取行为默认会建立依赖；若只需读取当前值，可用运行时 API `noTracking`（在执行传入函数期间暂停依赖追踪）或内建方法 `raw` 进行非响应式读取。`noTracking` 只暂停依赖追踪，不改变求值结果的类型，访问其返回值的属性仍可能建立依赖；需要原始值时结合 `toRaw`。非响应式读取并非“冻结”：当同一表达式中其他被追踪的依赖发生变化而触发重新求值时，非响应式读取的部分也会被重新执行并得到最新值。
9. 渲染层面：`raw` 读取不创建渲染副作用，仅在初始渲染时求值一次，之后依赖变化不触发更新；但其所在的条件渲染或列表渲染重新渲染时，其中的非响应式读取会以当前值重新求值。

## 约束

- 退化：`const` 声明且初始值为字面量类型（如数字或字符串字面量）时退化为 raw 值，显式标记被忽略（`const a = shallow(1)` 是 raw 值）。非字面量初始化器如 `const c = reactive({})` 正常推导。参见[响应性推导规则](docs://zh-cn/agent/references/reactivity-infer-rules.md)。
- `raw()` 让标识符脱离响应性：修改它不会更新页面。它仅显式标记标识符本身不具有响应性；若初始值本身具有响应性，其响应性能力不会被移除，要移除初始值的响应性需用 `toRaw` 获取原始值。
- `toReactive` 不会为传入值附加新的响应式能力，只返回该值对应的响应式代理对象；若该值未被编译器推导或显式标记为响应式，返回的代理也不是响应式的。
- 不要对非响应式值滥用 `alias`；它主要为简化深层嵌套属性的响应式访问而设计。
- 脚本内部的逻辑避免依赖响应性；用函数组合组织脚本逻辑。操作响应式数据有开销，过度使用会让变更流程不直观。

## 示例

编译器推导的响应性——模板自动更新：

```qk
<lang-js>
    let progress = "pending"

    setTimeout(() => {
        progress = "completed"
    }, 1000)
</lang-js>

<h1>Task status: {progress}</h1>
```

`raw()` 脱离响应性——`progress` 变化但页面不更新：

```qk
<lang-js>
    let progress = raw("pending")

    setTimeout(() => {
        progress = "completed"
    }, 1000)
</lang-js>

<h1>Task status: {progress}</h1>
```

两种形式的衍生响应式状态：

```qk
<lang-js>
    let number = 10

    const double = derived(() => number * 2)
    const doubleExp = derivedExp(number * 2)
</lang-js>

<p>{double} {doubleExp}</p>
```

非响应式读取——`message` 的变化不会触发 `summary` 重新求值：

```js
import { noTracking } from "qingkuai"

let count = reactive(0)
let message = reactive("hello")

// message 更新时不会触发 summary 重新求值
const summary = derived(() => {
    return count + noTracking(() => message)
})
```

指向深层嵌套目标的别名绑定：

```qk
<lang-js>
    let name = alias(refs.userInfo.detail.information.name)

    setTimeout(() => {
        name = "Unknown"
    }, 1000)
</lang-js>

<p>User name is: {name}</p>
```

## 参见

- [响应性推导规则](docs://zh-cn/agent/references/reactivity-infer-rules.md)
- [编译指令](docs://zh-cn/agent/basic/compilation-directives.md)
- [运行时 API](docs://zh-cn/agent/references/api.md)
