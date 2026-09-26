---
description: "Qingkuai 成员导出：支持的 export 语句形式、通过 &handle 获取组件实例消费导出成员，以及禁止的导出形式。"
keywords: ["export", "member exports", "component instance", "handle", "导出"]
---

# 成员导出

组件文件内的 `export` 语句把导出成员附加到组件实例上——组件文件编译为带默认导出的函数，因此导出成员要通过实例消费，而不是通过 `import`。

## 语法

| 形式 | 是否支持 | 消费方式 |
|---|---|---|
| 导出声明 | `export const someValue = "..."` / `export function f() {}` | 经实例成员：`child.someValue` |
| 导出列表 | `export { someFunction }` | 经实例成员：`child.someFunction()` |
| 默认导出 | ✗ 不支持 | — |
| 再导出（`export { x } from "..."`） | ✗ 不支持 | — |
| `export =` | ✗ 不支持 | — |
| 类型导出（`export type`/`export interface`/列表中的类型） | ✗ 不允许——类型在运行时不存在 | 共享类型请放入外部 `.ts` 文件，由各组件导入 |

## 规则

1. 导出成员通过 `&handle` 获得的组件实例访问（如 `<Child &handle={child} />`），然后 `child.exportedValue` / `child.exportedFunction()`——通常在 `onAfterMount` 内。
2. 跨组件共享类型（如 `Meta` 契约类型）时，在外部 `.ts` 文件中定义并在每个组件中 `import type`；导入 `Meta` 后组件即自动绑定该类型。
3. 组件文件内只有 `export 声明` 与 `export 列表` 两种合法形式。

## 示例

导出成员：

```qk
<lang-js>
    export function exportedFunction() {
        console.log("This function is exported")
    }

    export const exportedValue = "This value is exported"
</lang-js>
```

通过实例消费：

```qk
<lang-js>
    import Child from "./Child.qk"

    let child = null

    onAfterMount(() => {
        console.log(child.exportedValue) // logs: This value is exported
        child.exportedFunction() // logs: This function is exported
    })
</lang-js>

<Child &handle={child} />
```

在外部共享 `Meta` 契约类型：

```ts
// types.ts
export interface Meta {
    props: {
        title: string
    }
}
```

```qk
<lang-ts>
    import type { Meta } from "./types"
</lang-ts>
```

## 约束

- 绝不用 `import` 消费组件导出；它们是实例成员。
- 不要向组件文件添加 `export default`、再导出或类型导出——都是编译错误。

## 参见

- [组件基础](docs://zh-cn/agent/components/basic.md)
- [TypeScript 支持](docs://zh-cn/agent/misc/typescript.md)
- [组件属性](docs://zh-cn/agent/components/attributes.md)
