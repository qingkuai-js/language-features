# TypeScript 支持

Qingkuai 提供了完整的 [TypeScript](https://www.typescriptlang.org/) 支持，框架本身就使用 TypeScript 编写，并在设计层面充分考虑了类型系统的兼容性。无论是组件契约、指令、生命周期方法还是全局 API，Qingkuai 都提供了完善的类型提示与推导能力，帮助开发者在编写代码时获得更好的自动补全、错误检测与开发体验。对于追求类型安全和可维护性的项目，TypeScript 与 Qingkuai 是一对理想搭档。

> [!TIP]
> Qingkuai 对 TypeScript 配置零侵入，你可以像在纯 TypeScript 项目中一样，自由配置 tsconfig.json。通过 [create-qingkuai](https://www.npmjs.com/package/create-qingkuai) 创建的项目已经附带了必要的 TypeScript 配置项。

---

## 组件契约类型

在组件文件中，`Meta` 是一个保留的类型名称，用于声明组件的契约类型。`Meta` 的成员描述了组件对外的各个数据层：

```ts
interface Meta {
    props: {
        // ...
    }
    refs: {
        // ...
    }
    contexts: {
        // ...
    }
}
```

使用 `type` 关键字声明类型别名也是可以的：

```ts
type Meta = {
    props: {
        // ...
    }
}
```

> [!TIP]
> 三个成员都是可选的，未声明的成员会被视为空对象类型。例如，只声明 `props` 成员时，`refs` 与 `contexts` 内建标识符的类型就是空对象类型。

在语言服务层面，`props` 与 `contexts` 成员会被添加一层 `Readonly` 包装，因为组件属性与上下文不支持在组件内部直接修改，而 `refs` 成员保持可写：

```ts
interface Meta {
    props: {
        name: string
        list: string[]
    }
}

// Cannot assign to 'name' because it is a read-only property.ts(2540)
props.name = "..."
```

如果你的嵌入脚本语言为 JavaScript，可以通过 [JSDoc](https://jsdoc.app) 声明组件契约类型：

```js
/**
 * @typedef {Object} Meta
 * @property {Object} props
 * @property {string} props.name
 *
 * @property {Object} refs
 * @property {boolean} refs.checked
 */
```

或者：

```js
/**
 * @typedef {Object} Meta
 * @property {{ name: string }} props
 * @property {{ checked: boolean }} refs
 */
```

从外部文件导入 `Meta` 也是支持的：

```ts
import type { Meta } from "./types"
```

或者：

```ts
import type { SpecificMeta as Meta } from "./types"
```

> [!TIP]
> 组件文件不允许导出类型，共享的契约类型请放在外部 `.ts` 文件中，再由各组件从这里导入。详见 [成员导出](docs://zh-cn/components/exports.md)。

---

## 泛型参数

Qingkuai 组件支持泛型类型参数，直接将你需要定义的泛型参数添加到 `Meta` 类型声明中即可，`Meta` 也是组件文件中唯一允许声明泛型参数的位置：

```ts
interface Meta<T extends string | number> {
    refs: {
        value: T
    }
    props: {
        list: T[]
        onChange: (item: T) => void
    }
}
```

对应的 `JSDoc` 写法如下：

```js
/**
 * @template {string | number} T
 * @typedef {Object} Meta
 * @property {Object} [refs]
 * @property {T} refs.value
 *
 * @property {Object} props
 * @property {T[]} props.list
 * @property {(item: T) => void} props.onChange
 */
```

Qingkuai 语言服务器会根据组件属性推导泛型参数类型。例如在下面的示例中，`Outer.qk` 中 `Inner` 组件的 `list` 属性被推导为 `string[]`，因此 `T` 会被推导为 `string`：

```qk
<!-- Inner.qk -->
<lang-ts>
    interface Meta<T extends string | number> {
        props: {
            list: T[]
        }
    }
</lang-ts>
```

```qk
<!-- Outer.qk -->
<Inner !list={["a", "b", "c"]} />
```

当然，你也可以手动指定泛型实参以约束属性类型：

```qk
<!-- list 属性必须是数字数组 -->
<Inner<number> !list={[1, 2, 3]} />

<!-- list 属性必须是字符串数组 -->
<Inner<string> !list={["a", "b", "c"]} />
```

从外部文件导入的 `Meta` 不支持携带泛型参数。如果需要可复用的泛型契约，可以先在外部文件中定义携带泛型参数的契约类型，再在组件内部导入它并包装为 `Meta`：

```ts
// types.ts
export interface GenericMeta<T extends string | number> {
    props: {
        list: T[]
    }
}
```

```qk
<lang-ts>
    import type { GenericMeta } from "./types"

    type Meta<T extends string> = GenericMeta<T>;
</lang-ts>
```

---

## 默认值推断

在组件文件中，使用内建的 `defaults` 方法可以为组件的可选属性指定默认值，同时收窄 `props`、`refs` 与 `contexts` 的类型。

```ts
interface Meta {
    props: {
        name?: string
        age?: number
        fixed: string
    }
    refs: {
        checked?: boolean
    }
    contexts: {
        theme?: string
    }
}
```

`defaults` 的参数类型为 `Meta` 各成员中声明为可选的属性：
<img src="/static/medias/defaults-hover.png" alt="defaults-hover.png" style="width: 80%; margin-left: 10%;" />

调用 `defaults` 后，`props` 与 `refs` 中被设置了默认值的属性，其类型会在后续代码中被收窄为非可选（必填）类型，这与运行时表现一致：
<img src="/static/medias/defaults-type-narrowing.png" alt="defaults-type-narrowing.png" style="width: 80%; margin-left: 10%;" />

---

## 插槽上下文

在组件文件中你无需关心插槽类型声明，Qingkuai 语言服务会根据 `slot` 标签自动推导插槽上下文的类型：

```qk
<!-- DataList.qk -->
<lang-ts>
    const rows = [
        {
            id: 1,
            name: "Row 1"
        },
        {
            id: 2,
            name: "Row 2"
        }
    ]
</lang-ts>

<qk:spread #for={row of rows}>
    <slot !row>
        <!-- default content -->
    </slot>
</qk:spread>
```

导入上面的组件使用时，`row` 的类型会被自动推导：
<img src="/static/medias/inferred-slot-context.png" alt="inferred-slot-context.png" style="width: 80%; margin-left: 10%;" />

---

## 事件类型推断机制

在 Qingkuai 组件中，事件与其他非引用类型属性一样，都通过内建的 `props` 对象访问。也就是说，在组件标签上，属性名前的 `@` 和 `!` 前缀可以互换，`@` 主要用于语义标识，表示该属性是可调用的方法。当你为组件添加属性时，输入 `@` 会触发属性名自动补全，这些被提示的名称正是被推断为事件的属性。只要组件 `Meta` 类型中 `props` 成员的某个属性值是函数类型，Qingkuai 语言服务就会将其标记为事件候选项，并在你输入 `@` 时提供相应的属性名补全提示。下面代码中，`props` 成员的两个属性都会被推断为事件：

```ts
interface Meta {
    props: {
        event1: () => void
        event2?: (s: string) => boolean
    }
}
```

---

## 工具类型

运行时包导出了一组围绕组件契约的工具类型，用于在组件外部描述与解构组件的类型信息，或为包装组件手工声明契约。

### ComponentInstance

组件实例类型。组件文件的编译产物是一个默认导出的组件函数，组件实例的类型由该组件的导出成员与实例的内置属性共同组成：

```ts
import type { ComponentInstance } from "qingkuai"

import Child from "./Child.qk"

let child: ComponentInstance<typeof Child> | null = null
```

该实例类型包含组件导出的所有成员，因此访问 `child.exportedValue` 这类导出成员时都会带有完整的类型提示。

### ComponentProps

提取组件的**属性契约**，即组件契约类型 `Meta` 中 `props` 成员的类型。典型场景是编写包装组件或高阶组件工具时读取组件的[属性](docs://zh-cn/components/attributes.md)类型：

```ts
import type { ComponentProps } from "qingkuai"

import Child from "./Child.qk"

type ChildProps = ComponentProps<typeof Child>
```

### ComponentRefs

提取组件的**引用属性契约**，即 `Meta` 中 `refs` 成员的类型。典型场景是在调试工具或包装组件中读取组件对外暴露的[引用属性](docs://zh-cn/components/attributes.md#引用属性)类型：

```ts
import type { ComponentRefs } from "qingkuai"

import Form from "./Form.qk"

type FormRefs = ComponentRefs<typeof Form>
```

### ComponentSlots

提取组件的**插槽契约**，即组件接受的[插槽](docs://zh-cn/components/slots.md)及其[传递的上下文](docs://zh-cn/components/slots.md#传递上下文)类型：

```ts
import type { ComponentSlots } from "qingkuai"

import Layout from "./Layout.qk"

type LayoutSlots = ComponentSlots<typeof Layout>
```

### ComponentContexts

提取组件的**上下文契约**，即 `Meta` 中 `contexts` 成员的类型，可用于类型化[运行时](docs://zh-cn/components/contexts.md#在组件外部使用)的[上下文](docs://zh-cn/components/contexts.md)操作：

```ts
import type { ComponentContexts } from "qingkuai"

import ThemePanel from "./ThemePanel.qk"

type ThemePanelContexts = ComponentContexts<typeof ThemePanel>
```

### ComponentExports

提取组件的**导出成员类型**。组件导出的成员会被挂载到组件实例上，组件实例类型中的导出部分正是由它构成：

```ts
import type { ComponentExports } from "qingkuai"

import Counter from "./Counter.qk"

type CounterExports = ComponentExports<typeof Counter>
```

### DeclareComponent

声明一个组件契约，产出与编译后的组件相同的组件类型。用于包装组件、组件类型的模块参数、类型桩等无法从组件文件获得类型推导的场景：

```ts
import type { DeclareComponent } from "qingkuai"

type Dialog = DeclareComponent<{
    props: { title: string }
    exports: { open: () => void }
}>
```

### BoundLifecycleFunc

组件文件内建[生命周期](docs://zh-cn/components/lifecycle.md)方法的类型，由于这些方法已被编译器绑定到当前组件实例，调用时不再接收实例参数；当外部模块需要接受这些内建方法作为参数时，使用对应类型标注：

```ts
import type { BoundLifecycleFunc } from "qingkuai"

// 外部模块：接受组件内建的生命周期方法作为参数
export function registerDestroyHook(onBeforeDestroy: BoundLifecycleFunc) {
    onBeforeDestroy(() => {
        // 释放外部资源
    })
}
```

### BoundEffectFunc / BoundWatchFunc

组件文件内建[监视器与副作用](docs://zh-cn/basic/watchers-and-side-effects.md)方法的类型，由于这些方法已被编译器绑定到当前组件实例，调用时不再接收实例参数；当外部模块需要接受这些内建方法作为参数时，使用对应类型标注：

```ts
import type { BoundEffectFunc } from "qingkuai"

// 外部模块：接受组件内建的 effect 方法作为参数
export function collectEffects(effect: BoundEffectFunc) {
    effect(() => {
        // ...
    })
}
```

### BoundSetContextFunc / BoundSetContextGetterFunc

组件内建 `setContext` 与 `setContextGetter` 方法对应的「绑定形态」类型，它接受一个组件契约类型作为泛型参数，返回一个绑定了当前组件实例的函数类型。外部模块可以使用它们来接受组件内建的上下文设置方法：

```ts
import type ThemePanel from "./ThemePanel.qk"
import type { BoundSetContextFunc } from "qingkuai"

// 外部模块：接受组件内建的 setContext 方法作为参数
export function provideTheme(
    setContext: BoundSetContextFunc<typeof ThemePanel>
) {
    setContext("theme", "dark")
}
```
