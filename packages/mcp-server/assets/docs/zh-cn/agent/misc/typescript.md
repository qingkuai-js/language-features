---
description: "Qingkuai TypeScript 支持：Meta 组件契约、Meta 上的泛型、defaults 类型收窄、插槽/事件推导，以及运行时工具类型（ComponentInstance、ComponentProps 等）。"
keywords: ["typescript", "Meta", "generic", "utility types", "ComponentInstance", "类型"]
---

# TypeScript 支持

Qingkuai 提供完整的 TypeScript 支持且不侵入 tsconfig。保留类型名 `Meta` 声明组件契约；运行时包的工具类型从外部描述组件。

## 语法

| 工具类型 | 含义 |
|---|---|
| `ComponentInstance<C>` | 组件实例类型；包含全部导出成员（如 `child.exportedValue`） |
| `ComponentProps<C>` | 提取 `Meta` 的 `props` 契约——用于包装/高阶组件 |
| `ComponentRefs<C>` | 提取 `Meta` 的 `refs` 契约——引用属性类型 |
| `ComponentSlots<C>` | 提取组件接受的插槽及其传递上下文类型 |
| `ComponentContexts<C>` | 提取 `Meta` 的 `contexts` 契约——用于运行时上下文操作 |
| `ComponentExports<C>` | 提取挂载到实例上的导出成员类型 |
| `DeclareComponent<{...}>` | 手动声明契约（包装组件、类型桩），产出与编译后组件相同的类型 |
| `BoundLifecycleFunc` | 内建生命周期方法的类型（已绑定实例，无实例参数） |
| `BoundEffectFunc` / `BoundWatchFunc` | 内建监视器/副作用方法的类型，供外部模块参数使用 |
| `BoundSetContextFunc<C>` / `BoundSetContextGetterFunc<C>` | 内建 `setContext`/`setContextGetter` 的绑定形式；以组件契约类型为泛型参数 |

## 规则

1. `Meta` 的成员——`props`、`refs`、`contexts`——全部可选；未声明的成员成为空对象类型。语言服务会把 `props` 与 `contexts` 包装为 `Readonly`（禁止写入）；`refs` 保持可写。
2. 声明 `Meta` 可用 `interface Meta {...}`、`type Meta = {...}`，JS 中用 JSDoc `@typedef {Object} Meta` 加 `@property` 行。也支持从外部文件导入（`import type { Meta } from "./types"`，允许别名导入）。
3. 组件文件不能导出类型；共享契约（含 `Meta`）放在外部 `.ts` 文件中。
4. `Meta` 是组件文件内唯一可声明泛型参数的位置（`interface Meta<T extends string | number>`）；语言服务器从组件属性推导 `T`，显式参数可约束类型：`<Inner<number> !list={[1, 2, 3]} />`。导入的 `Meta` 不能携带泛型——先导入泛型契约类型再包装：`type Meta<T extends string> = GenericMeta<T>`。
5. `defaults({ props: {...}, refs: {...}, contexts: {...} })` 只接受 `Meta` 各成员中声明为可选的属性；`props` 与 `refs` 中给了默认值的键随后收窄为非可选（必填）。
6. 插槽上下文类型从 `slot` 标签自动推导——无需声明。
7. 事件推导：`props` 成员中任何函数类型的属性都是事件候选；在组件标签输入 `@` 时补全的正是这些名字。`@` 与 `!` 在组件属性名前可互换——`@` 从语义上标记可调用性。

## 示例

带泛型的组件契约，从属性推导：

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
<!-- Outer.qk：T 推导为 string -->
<lang-ts>
    import Inner from "./Inner.qk"
</lang-ts>

<Inner !list={["a", "b", "c"]} />

<!-- 显式泛型参数 -->
<Inner<number> !list={[1, 2, 3]} />
```

实例与契约提取（纯 ts）：

```ts
import type { ComponentInstance, ComponentProps } from "qingkuai"

import Child from "./Child.qk"

let child: ComponentInstance<typeof Child> | null = null
type ChildProps = ComponentProps<typeof Child>
```

手动契约声明（纯 ts）：

```ts
import type { DeclareComponent } from "qingkuai"

type Dialog = DeclareComponent<{
    props: { title: string }
    exports: { open: () => void }
}>
```

## 参见

- [成员导出](docs://zh-cn/agent/components/exports.md)
- [组件属性](docs://zh-cn/agent/components/attributes.md)
- [组件上下文](docs://zh-cn/agent/components/contexts.md)
