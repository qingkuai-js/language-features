---
description: "Qingkuai 配置：.qingkuairc 运行配置选项（reactivityMode、whitespace、resolveImportExtension 等）与 Prettier 的 qingkuai 格式化选项。"
keywords: ["config", ".qingkuairc", "prettierrc", "reactivityMode", "whitespace", "format", "配置"]
---

# 配置文件

运行配置按目录通过 `.qingkuairc` 文件修改；组件文件受当前目录或其最近上级目录中的配置文件影响。格式化遵循标准 Prettier 配置，Qingkuai 专属选项与常规 Prettier 选项一样直接写在配置文件的一级属性中。

## 运行配置（.qingkuairc）

| 属性 | 类型/取值 | 默认值 | 含义 |
|---|---|---|---|
| `reactivityMode` | `"reactive"` \| `"shallow"` | `"reactive"` | 默认推导的响应性模式；`shallow` 仅追踪顶层值的变化，嵌套值不被自动追踪 |
| `whitespace` | `"preserve"` \| `"trim"` \| `"collapse"` \| `"trim-collapse"` | `"trim-collapse"` | 模板空白处理方式 |
| `preserveHtmlComments` | `"never"` \| `"always"` \| `"development"` \| `"production"` | `"development"` | 是否保留 HTML 注释 |
| `requireReactivityMark` | boolean | `false` | `true` 时要求脚本块顶层变量声明用响应性内建方法（`raw`/`reactive`/`shallow`/`derived`/`alias`）显式标记，否则编译报错 |
| `resolveImportExtension` | boolean | `true` | 允许导入语句省略 `.qk`：`import Component from "./Component"` |
| `allowConstReactive` | boolean | `true` | `false` 时常量声明的变量不会被推导为具有响应性，显式用 `reactive`/`shallow` 标记常量声明会引发编译错误 1070 |
| `interpretiveComments` | boolean | `true` | 在编译结果中插入解释性注释 |

## 格式化配置（.prettierrc）

| 属性 | 类型/取值 | 默认值 | 含义 |
|---|---|---|---|
| `spaceAroundInterpolation` | boolean | `false` | `true` 时格式化为 `#for={ item, index of 3 }` |
| `selfCloseEmptySlotTags` | boolean | `true` | 空 `slot` 标签格式化为 `<slot />` |
| `componentTagFormatPreference` | `"camel"` \| `"kebab"` | `"camel"` | 组件标签格式 + 补全建议风格 |
| `componentAttributeFormatPreference` | `"camel"` \| `"kebab"` | `"camel"` | 组件属性格式 + 补全建议风格 |

## 规则

1. 最近的 `.qingkuairc` 生效：组件优先采用其所在目录的配置文件，其次向上遍历父目录。
2. 所有运行时选项都有默认值；没有配置文件的项目开箱即用。
3. 格式化由 `prettier-plugin-qingkuai` 实现；标准 Prettier 选项（`tabWidth`、`printWidth` 等）照常生效。

## 示例

```json
{
    "reactivityMode": "shallow",
    "whitespace": "preserve"
}
```

```json
{
    "tabWidth": 4,
    "printWidth": 80,
    "spaceAroundInterpolation": true
}
```

## 参见

- [响应性推导规则](docs://zh-cn/agent/references/reactivity-infer-rules.md)
- [响应性](docs://zh-cn/agent/basic/reactivity.md)
- [语言功能](docs://zh-cn/agent/misc/language-features.md)
