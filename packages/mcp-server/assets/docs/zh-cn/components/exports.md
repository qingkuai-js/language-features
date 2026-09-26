# 成员导出

在组件化开发中，导出机制决定了组件可以向外部暴露哪些能力，以及这些能力应当以何种形式被消费。合理的导出设计不仅能提升组件的复用性和可维护性，也能有效约束内部实现细节，避免不必要的耦合。通过本节内容，你将了解 Qingkuai 组件文件中的导出规则与常见实践，帮助你在封装能力与对外可用性之间取得平衡。

---

## 定义及使用

在组件文件的嵌入脚本块中，可以像普通 JS/TS 模块一样使用 `export` 语句来导出变量、函数或类等：

```qk
<lang-js>
    export function exportedFunction() {
        console.log("This function is exported")
    }

    export const exportedValue = "This value is exported"
</lang-js>
```

组件文件经编译器处理后是一个默认导出的函数，而 `export` 语句会被挂载到组件实例上。因此在访问组件导出的成员时，不能像访问普通模块成员那样直接使用 `import` 语句，而是需要通过组件实例来访问：

|js|ts|

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

```qk
<lang-js>
    import type { ComponentInstance } from "qingkuai"

    import Child from "./Child.qk"

    let child: ComponentInstance<typeof Child> | null = null

    onAfterMount(() => {
        console.log(child.exportedValue) // logs: This value is exported
        child.exportedFunction() // logs: This function is exported
    })
</lang-js>

<Child &handle={child} />
```

---

## 语法局限性

由于组件文件的导出会被挂载到组件实例上，因此组件文件中的导出语句存在一些局限性，仅支持 `导出声明` 和 `导出列表` 两种形式的导出语句：

```qk
<lang-js>
    // 支持导出声明
    export const someValue = "This value is exported"

    // 支持导出列表
    const someFunction = () => {
        console.log("This function is exported")
    }
    export { someFunction }
</lang-js>
```

不支持 `导出默认值` 、 `再导出` 以及 `export =` 等其他形式的导出语句：

```qk
<lang-ts>
    // 不支持导出默认值
    export default function defaultExportedFunction() {}

    // 不支持再导出
    export { someFunction } from "./someModule"
</lang-ts>
```

组件文件的导出会被挂载到组件实例上，而类型在运行时并不存在，因此组件文件不允许导出任何类型：

```qk
<lang-ts>
    type SomeTypeAlias = {}

    export { SomeTypeAlias }

    export type SomeType = {}

    export interface SomeInterface {}

    export type { ExternalType } from "./types"
</lang-ts>
```

如果你需要跨组件共享类型（例如组件契约类型 `Meta`），推荐的做法是将这些类型定义在外部 `.ts` 文件中，再由各组件导入：

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

> [!TIP]
> 组件导入 `Meta` 类型后，就已经绑定了该类型，无需额外操作，详见 [TypeScript 支持](docs://zh-cn/misc/typescript.md)。
