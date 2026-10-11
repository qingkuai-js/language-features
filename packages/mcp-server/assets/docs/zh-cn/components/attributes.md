# 属性

在 Qingkuai 中，我们可以像普通 HTML 标签那样，为组件标签添加属性来传递参数。这一行为称为组件属性传递，用于向组件传递外部数据或配置。通过组件属性，组件可以在不同场景下表现出不同的行为或样式，从而提升复用性和灵活性。

---

## 静态属性

静态属性会作为字符串传递给组件，在组件内部通过内建的 `props` 标识符访问外部传递的属性值：

|js|ts|

```qk
<!-- Inner.qk -->
<lang-js>
    /**
     * @typedef {Object} Meta
     * @property {Object} props
     * @property {string} props.msg
     */
    console.log(props.msg) // logs: value
</lang-js>
```

```qk
<!-- Inner.qk -->
<lang-ts>
    interface Meta {
        props: {
            msg: string
        }
    }
    console.log(props.msg) // logs: value
</lang-ts>
```

```qk
<!-- Outer.qk -->
<Inner msg="value" />
```

> [!TIP]
> 上方示例中的 [JSDoc](https://jsdoc.app/) 与 `interface` 作用相同：为 `props` 声明类型以提供属性补全，详见 [TypeScript 支持](docs://zh-cn/misc/typescript.md)。

在组件标签上添加某个属性名称但未给定属性值时，组件内部接收到的是布尔值 `true`：

|js|ts|

```qk
<!-- Inner.qk -->
<lang-js>
    /**
     * @typedef {Object} Meta
     * @property {Object} props
     * @property {boolean} [props.isOk]
     */
    console.log(props.isOk) // logs: true
</lang-js>
```

```qk
<!-- Inner.qk -->
<lang-ts>
    interface Meta {
        props: {
            isOk?: boolean
        }
    }
    console.log(props.isOk) // logs: true
</lang-ts>
```

```qk
<!-- Outer.qk -->
<Inner isOk />
```

---

## 动态属性

传递给组件的动态属性在组件内部同样通过 `props` 内建标识符访问，但动态属性支持传递更多的数据类型，而不只局限于字符串，并且数据源发生变更时，组件内部使用该属性的 DOM 元素会被更新：

|js|ts|

```qk
<!-- Inner.qk -->
<lang-ts>
    /**
     * @typedef {Object} Meta
     * @property {Object} props
     * @property {string[]} props.list
     */
</lang-ts>

<p>The length of list is: {props.list.length}</p>
```

```qk
<!-- Inner.qk -->
<lang-ts>
    interface Meta {
        props: {
            list: string[]
        }
    }
</lang-ts>

<p>The length of list is: {props.list.length}</p>
```

```qk
<!-- Outer.qk -->
<lang-ts>
    const list = ["js", "ts", "qk"]
    setTimeout(list.pop, 1000)
</lang-ts>

<Inner !list />
```

---

## 事件

组件事件与其他非引用属性一样，在组件内部通过内建的 `props` 标识符访问：

|js|ts|

```qk
<!-- Inner.qk -->
<lang-js>
    /**
     * @typedef {Object} Meta
     * @property {Object} props
     * @property {(msg: string) => void} props.someThingHappened
     */
    setTimeout(() => {
        props.someThingHappened("event is triggered.")
        // logs: event is triggered.
    }, 1000)
</lang-js>
```

```qk
<!-- Inner.qk -->
<lang-ts>
    interface Meta {
        props: {
            someThingHappened: (msg: string) => void
        }
    }
    setTimeout(() => {
        props.someThingHappened("event is triggered.")
        // logs: event is triggered.
    }, 1000)
</lang-ts>
```

```qk
<!-- Outer.qk -->
<Inner @someThingHappened={console.log($arg)} />
```

> [!TIP]
> 组件事件在传递和使用上与其他非引用属性没有区别，唯一的不同在于它们的语义：组件事件通常表示组件内部发生的某些行为或状态变化，而组件属性则更倾向于表示组件的配置或数据输入。因此，在设计组件接口时，我们建议将需要传递给组件的回调函数命名为事件，并使用 @ 前缀来标识它们，以便更清晰地表达它们的用途和语义。

> [!TIP]
> Qingkuai 语言服务器在提供补全建议时，只有属性值为函数类型的属性才会被提示为事件。

---

## 引用属性

引用属性是组件中的重要能力，它使组件内部可以修改外部传入的值。由于 `props` 对象中的属性本质上是只读 `getter`，因此无法直接修改。此时，需要通过引用属性提供的引用传递机制来实现该目的。在 Qingkuai 中，组件文件内建了 `refs` 标识符，用于访问外部传入的引用属性。通过修改 `refs` 中的属性值，不仅可以同步改变外部数据，还能触发其响应式更新。下面是一个简单示例：

|js|ts|

```qk
<!-- Inner.qk -->
<lang-js>
    /**
     * @typedef {Object} Meta
     * @property {Object} refs
     * @property {string} refs.name
     */
</lang-js>

<p>Inner name: {refs.name}</p>
<button @click={refs.name = "Qingkuai"}>Change the name</button>
```

```qk
<!-- Inner.qk -->
<lang-ts>
    interface Meta {
        refs: {
            name: string
        }
    }
</lang-ts>

<p>Inner name: {refs.name}</p>
<button @click={refs.name = "Qingkuai"}>Change the name</button>
```

```qk
<!-- Outer.qk -->
<lang-js>
    import Inner from "./Inner.qk"

    let name = "JavaScript"
</lang-js>

<p>Outer name: {name}</p>
<Inner &name={name} />
```

在点击 `Change the name` 按钮前，渲染结果为：

```html
<p>Outer name: JavaScript</p>
<p>Inner name: JavaScript</p>
<button>Change the name</button>
```

按钮被点击后，渲染结果变为：

```html
<p>Outer name: Qingkuai</p>
<p>Inner name: Qingkuai</p>
<button>Change the name</button>
```

> [!WARNING]
> 如果 `props` 中某个属性值本身是复杂类型（如对象或数组），其内部数据在技术上仍可被修改。例如，当 `props.userInfo` 是对象时，`props.userInfo.name` 依然可以被改写。但不建议这样做，因为这会让组件状态变得更难追踪和维护。

需要注意的是，`&handle` 属性在组件标签上是一个特殊的引用属性，用于获取组件实例，所以命名引用属性时请避免使用 `handle` 这个名称：

|js|ts|

```qk
<lang-js>
    let child = null

    onAfterMount(() => {
        // 通过 Child 查看组件状态或访问组件导出
    })
</lang-js>

<Child &handle={child} />
```

```qk
<lang-ts>
    import type { ComponentInstance } from "qingkuai"

    import Child from "./Child.qk"

    let child: ComponentInstance<typeof Child> | null = null

    onAfterMount(() => {
        // 通过 Child 查看组件状态或访问组件导出
    })
</lang-ts>

<Child &handle={child} />
```

> [!TIP]
> `onAfterMount` 时组件内建的[生命周期](docs://zh-cn/components/lifecycle.md)回调注册方法。

> [!TIP]
> 这与通过 `&handle` [获取 DOM 节点](docs://zh-cn/basic/reference-attributes.md#获取-dom-元素)一样：当组件被销毁时，引用属性会自动将绑定的变量重置为 `null` ，这能有效避免悬空引用造成的内存泄漏。

---

## 响应式解构

解构 `props` 或 `refs` 内建对象时，解构语句本身会触发一次对应属性的 `getter`，但解构得到的标识符只是一个独立的普通变量，后续对它的访问和修改都不会再经过 `getter`，因此与外部传入的属性值失去了关联。具体影响取决于属性值的类型：

- **原始类型**（如字符串、数字）：解构出的标识符可能会被推导为具有独立的响应性，组件内部依赖它的视图会随之更新；但它与外部传入的属性值已失去关联，外部依赖该属性的内容不会更新：

    ```qk
    <!-- Inner.qk -->
    <lang-js>
        let { name } = refs

        // Outer 视图不更新，Inner 视图更新
        name = "Qingkuai"
    </lang-js>

    <p>Inner name: {name}</p>
    ```

    ```qk
    <!-- Outer.qk -->
    <lang-js>
        let name = "JavaScript"
    </lang-js>

    <Inner &name={name} />
    <p>Outer name: {name}</p>
    ```

- **复杂类型**（如对象、数组）：当属性值本身是响应式对象时，解构出的标识符仍指向该对象，访问其属性依然具有响应性；而对标识符本身的重新赋值则与原始类型的行为一致，只会更新局部视图，不会同步到外部传入的值：

    ```qk
    <!-- Inner.qk -->
    <lang-js>
        let { userInfo } = refs

        // Outer、Inner 视图都会更新
        userInfo.name = "Qingkuai"

        // Outer 视图不更新，Inner 视图更新
        userInfo = { name: "Qingkuai" }
    </lang-js>

    <p>Inner user name: {userInfo.name}</p>
    ```

    ```qk
    <!-- Outer.qk -->
    <lang-js>
        let userInfo = {
            name: "JavaScript"
        }
    </lang-js>

    <Inner &userInfo={userInfo} />
    <p>Outer user name: {userInfo.name}</p>
    ```

> [!TIP]
> 上述解构行为与普通 JavaScript 中解构普通对象的行为保持一致，Qingkuai 遵循这一语义以避免概念上的混乱。

如果目的是对组件属性进行响应式解构，推荐固定搭配内建的 `alias` 方法使用，这是一个好习惯。这种显式标记的方式能够消除歧义，使代码意图一目了然，便于团队协作中的代码审查与维护：

```js
// 访问/写入 name 具有响应性
let { name } = alias(refs)

// 访问 userInfo 具有响应性
const { userInfo } = alias(props)
```

> [!TIP]
> 经编译器处理后，通过 `alias` 创建的别名标识符会被完全转换为对原始属性的访问表达式，运行时不存在额外的包装开销。更多细节参考 [响应性别名](docs://zh-cn/basic/reactivity.md#响应性别名)。

---

## 指定默认值

组件属性支持默认值，当父组件未传递某个属性时，组件内部可以指定默认值来保证组件的正常运行。通过内建的 `defaults` 方法，可以为组件的属性指定默认值：

|js|ts|

```js
/**
 * @typedef {Object} Meta
 * @property {Object} refs
 * @property {boolean} [refs.checked]
 *
 * @property {Object} props
 * @property {number} [props.age]
 * @property {string} [props.name]
 * @property {string} props.description
 */
defaults({
    refs: {
        checked: false
    },
    props: {
        age: 0,
        name: "Unknown"
    }
})
```

```ts
interface Meta {
    refs: {
        checked?: boolean
    }
    props: {
        age?: number
        name?: string
        description: string
    }
}
defaults({
    refs: {
        checked: false
    },
    props: {
        age: 0,
        name: "Unknown"
    }
})
```

> [!TIP]
> 调用 `defaults` 后，被设置了默认值的键会在后续代码中被收窄为非可选，详见 [默认值推断](docs://zh-cn/misc/typescript.md#默认值推断)。

---

## 属性名称格式

Qingkuai 组件的属性名称与组件名称一样，支持 kebab 格式和驼峰格式，下面两种写法等效：

```qk
<Component myAttr />
<Component my-attr />
```

默认情况下，格式化组件文件时会将所有 kebab 格式的组件属性或事件名称整理为驼峰格式。但你可以通过在组件文件所在目录或其上级目录中添加 `.prettierrc` 文件，并输入以下内容将属性名称偏好修改为 kebab 格式：

```json
{
    "componentAttributeFormatPreference": "kebab"
}
```

> [!TIP]
> 使用此配置时，Qingkuai 语言服务器在提供组件属性补全建议时，也会优先提示 kebab 格式的属性名称。
