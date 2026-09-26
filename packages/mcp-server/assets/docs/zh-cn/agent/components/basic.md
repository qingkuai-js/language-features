---
description: "Qingkuai 组件文件：基于文件的定义模型、导入与标签使用、kebab-case/camelCase 命名等价性，以及成员访问标签。"
keywords: ["component", "component file", ".qk", "import", "tag", "kebab-case", "组件"]
---

# 组件基础

组件是构建 Qingkuai 界面的基本单元。每个 `.qk` 文件定义一个组件；编译后它成为一个带默认导出的 JavaScript 模块。

## 语法

| 形式 | 语法 | 含义 |
|---|---|---|
| 导入组件 | `import Component from "./Component.qk"` | 在嵌入脚本块内 |
| 使用组件 | `<Component />` | 标签名与导入标识符同名；可多次使用 |
| kebab-case 标签 | `<my-component />` | 等价于 `<MyComponent />` |
| 成员访问标签 | `<Module.default />` | 常见于异步组件 |

## 规则

1. 一个 `.qk` 文件对应一个组件；导入后在模板区以与导入标识符同名的标签复用。
2. 以大写字母开头或包含 `-`、`.` 的标签名会被视为组件标签。
3. 默认情况下，格式化会把组件名转换为 camelCase；在 `.prettierrc` 中配置 `{"qingkuai": {"componentTagFormatPreference": "kebab"}}` 可切换为 kebab-case，语言服务也会随之在补全中优先给出 kebab-case 标签。
4. 组件标签支持成员访问语法（`<Module.default />`），常见于异步组件。

## 示例

```qk
<lang-js>
    import Component from "./Component.qk"
</lang-js>

<Component />
<Component />
```

## 参见

- [组件属性](docs://zh-cn/agent/components/attributes.md)
- [成员导出](docs://zh-cn/agent/components/exports.md)
- [异步组件](docs://zh-cn/agent/components/async-components.md)
