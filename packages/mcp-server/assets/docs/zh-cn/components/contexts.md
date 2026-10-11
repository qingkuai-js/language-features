# 上下文

在组件化开发中，有些数据需要被组件的所有后代共享，例如主题配色、当前登录用户、国际化语言等。如果通过属性逐层传递，中间的每一层组件都不得不声明并转发它们并不需要的数据。虽然[响应性状态存储](docs://zh-cn/basic/reactivity.md#响应性状态存储)也能实现跨组件共享，但它需要使用方显式导入状态模块，数据流向是分散在各个导入点的；而上下文（Context）提供了一条沿组件树自上而下传递的通信通道：组件把数据写入自己的上下文层，其所有后代组件都可以直接读取，无需逐层传递，也无需感知数据来自哪个祖先。这种隐式注入的方式特别适合主题、语言等由应用层统一提供、被大范围后代消费的场景。

---

## 基本用法

在组件文件的嵌入脚本中，通过内建的 `setContext` 方法将数据写入当前组件的上下文层：

|js|ts|

```qk
<!-- Outer.qk -->
<lang-js>
    import { Inner } from "./Inner.qk"

    /**
     * @typedef {Object} Meta
     * @property {Object} contexts
     * @property {string} [contexts.theme]
     */
    setContext("theme", "dark")
</lang-js>

<Inner />
```

```qk
<!-- Outer.qk -->
<lang-ts>
    import { Inner } from "./Inner.qk"

    interface Meta {
        contexts: {
            theme?: string
        }
    }
    setContext("theme", "dark")
</lang-ts>

<Inner />
```

> [!TIP]
> 示例中的 [JSDoc](https://jsdoc.app/) 与 `interface` 作用相同：为 `contexts` 声明类型以提供属性补全，详见 [TypeScript 支持](docs://zh-cn/misc/typescript.md)。

后代组件通过内建的 `contexts` 标识符读取上下文数据，脚本与模板中均可使用：

```qk
<!-- Inner.qk -->
<lang-js>
    console.log(contexts.theme) // logs: dark
</lang-js>

<button !class={contexts.theme}>Theme Button</button>
```

---

## 继承

每个组件都有属于自己的上下文层，其原型指向父组件的上下文层。读取 `contexts` 时会沿[原型链](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain)查找，返回最近的值：

- 在本组件层写入的同名键会遮蔽从父组件继承的键，且不会影响父组件的值；
- 后代组件读取时，总是取到沿原型链向上遇到的第一个值。

利用就近遮蔽的特性，可以在组件树的不同子树中写入同名键，让同一份契约在不同子树中呈现不同的值：

```qk
<!-- Outer.qk -->
<lang-js>
    setContext("theme", "dark")
</lang-js>

<Middle />
```

```qk
<!-- Middle.qk -->
<lang-js>
    // 沿原型链读取到 Outer 写入的值
    console.log(contexts.theme) // logs: dark

    // 写入同名键，遮蔽 Outer 的值
    setContext("theme", "light")
</lang-js>

<Inner />
```

```qk
<!-- Inner.qk -->
<lang-js>
    // 就近读取到 Middle 写入的值
    console.log(contexts.theme) // logs: light
</lang-js>
```

---

## 响应性

`setContext` 写入的值不会随数据源的变化而更新，因为写入时只取了当时的值，后续对数据源的修改不会同步到上下文。其逻辑与[响应式解构](docs://zh-cn/components/attributes.md#响应式解构)类似：

```js
let count = reactive(0)

// 写入的是当时的值，后续 count 变化不会同步到上下文
setContext("count", count)

// 后代读取 contexts.count 仍是 0
count = 5
```

若要保持上面示例中 `count` 的响应性，可以将上下文值写入为一个 `getter` 函数，并在后代组件读取上下文时调用它：

```js
let count = reactive(0)
setContext("getCount", () => count)

// 后代组件中读取时调用getter
contexts.getCount()
```

如果希望后代组件读取时无需手动调用 `getter` 函数，可以使用 `setContextGetter` 方法，这可以消除访问侧的手动调用：

```js
let count = reactive(0)
setContextGetter("count", () => count)

// 后代组件读取时无需手动调用 getter
contexts.count
```

与其他 `Exp` 系列 API 一致，`setContextExp` 方法允许你以表达式简写的形式写入上下文值，编译器会自动将传入的表达式包装为 `getter` 并转换为 `setContextGetter` 调用：

```js
let count = reactive(0)
setContextExp("count", count)

// 后代组件读取时无需手动调用 getter
contexts.count
```

---

## 指定默认值

通过内建的 `defaults` 方法可以为可选的上下文键指定默认值。当上下文链上不存在对应键时，读取将回退到默认值：

|js|ts|

```js
/**
 * @typedef {Object} Meta
 * @property {Object} contexts
 * @property {string} [contexts.theme]
 */

defaults({
    contexts: {
        theme: "light"
    }
})
```

```ts
interface Meta {
    contexts: {
        theme?: string
    }
}

defaults({
    contexts: {
        theme: "light"
    }
})
```

> [!TIP]
> 调用 `defaults` 后，被设置了默认值的键会在后续代码中被收窄为非可选，详见 [默认值推断](docs://zh-cn/misc/typescript.md#默认值推断)。

---

## 在组件外部使用

[运行时包](docs://zh-cn/references/terminology.md#运行时包)导出了上下文相关 API，供外部模块操作指定[组件实例](docs://zh-cn/references/terminology.md#组件实例)的上下文：

- `setContext`：向目标组件的上下文层写入数据；
- `setContextGetter`：向目标组件的上下文层写入响应式 `getter`；
- `getContexts`：返回目标组件的上下文链头对象，例如在通过 `&handle` 获取子组件实例后读取其上下文。

与[监视器与副作用的外部注册](docs://zh-cn/basic/watchers-and-side-effects.md#外部注册)类似，主要有两种方式将上下文操作绑定到组件实例：

1. 组件文件中的 `setContext`、`setContextGetter` 是已与当前组件实例绑定的[内建方法](docs://zh-cn/references/terminology.md#内建方法)，将它们作为参数传递，外部模块即可直接操作当前组件的上下文层：

    |js|ts|

    ```js
    // theme.js
    export function setThemeContext(setContext, value) {
        setContext("theme", value)
    }
    ```

    ```ts
    // theme.ts
    import type { DeclareComponent, BoundSetContextFunc } from "qingkuai"

    type SetThemeContextFunc = BoundSetContextFunc<
        DeclareComponent<{
            contexts: {
                theme: string
            }
        }>
    >

    export function setLightTheme(setContext: SetThemeContextFunc) {
        setContext("theme", "light")
    }
    ```

    ```qk
    <lang-js>
        import { setLightTheme } from "./theme"

        setLightTheme(setContext)
    </lang-js>
    ```

2. 从运行时包导入的上下文 API 通过第一个参数指定目标实例，其余用法与内建方法完全一致。组件文件内建了 `instance` 标识符，指向当前组件自身的实例：

    |js|ts|

    ```js
    // theme.js
    import { getContexts } from "qingkuai"

    export function getThemeContext(instance) {
        return getContexts(instance).theme
    }
    ```

    ```ts
    // theme.ts
    import type { DeclareComponent, ComponentInstance } from "qingkuai"

    import { getContexts } from "qingkuai"

    type InstanceWithThemeContext = ComponentInstance<
        DeclareComponent<{
            contexts: {
                theme: string
            }
        }>
    >

    export function getThemeContext(instance: InstanceWithThemeContext) {
        return getContexts(instance).theme
    }
    ```

    |js|ts|

    ```qk
    <lang-js>
        import { getThemeContext } from "./theme"

        let child = null

        // 获取当前组件的 theme 上下文值
        getThemeContext(instance)

        // 获取子组件的 theme 上下文值
        getThemeContext(child)
    </lang-js>

    <Child &handle={child} />
    ```

    ```qk
    <lang-ts>
        import type { ComponentInstance } from "qingkuai"

        import Child from "./Child.qk"

        import { getThemeContext } from "./theme"

        let child: ComponentInstance<typeof Child> | null = null

        // 获取当前组件的 theme 上下文值
        getThemeContext(instance)

        // 获取子组件的 theme 上下文值
        getThemeContext(child)
    </lang-ts>

    <Child &handle={child} />
    ```
