# 语言功能

Qingkuai 并不在编译器中内建复杂的语法扩展，而是通过基于 [LSP](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/)（语言服务协议）的语言服务，提供了丰富的语言功能支持。这些功能包括类型推导、智能补全、诊断提示、快速跳转、语义高亮等，覆盖组件属性、插槽、样式作用域、指令系统、引用传递等框架特性。借助 LSP，Qingkuai 在保持语法简洁的同时，显著提升了开发体验与类型安全。

---

## IDE 扩展

目前我们仅在 [VS Code](https://code.visualstudio.com) 中发布了扩展，你可以在 [VS Code 扩展市场](https://marketplace.visualstudio.com/items?itemName=qingkuai-tools.qingkuai-language-features) 或在 VS Code 扩展中搜索 `Qingkuai` 来安装它。

<img src="/static/medias/extension.png" alt="VS Code 扩展" />

> [!TIP]
> 当你在 IDE 中遇到问题时，可以在 Qingkuai 的 [language-features](https://github.com/qingkuai-js/language-features) 仓库提交 issue。

---

## Emmet

Qingkuai 语言服务提供了良好的 [Emmet](https://emmet.io) 支持，但由于动态属性与 Emmet 的移除属性语法存在冲突，因此在组件文件中改用 `-` 字符移除属性。下面的示例会在组件文件中通过 Emmet 语法创建一个不带 type 属性的 input 标签：

```txt
input[-type]
```

而原有的语法：

```txt
input[!type]
```

会创建一个动态属性：

```qk
<input !type={}>
```

---

## 格式化

Qingkuai 语言服务内置了文档格式化功能，该功能由 [prettier-plugin-qingkuai](https://www.npmjs.com/package/prettier-plugin-qingkuai) 实现。当组件文件中存在语法错误时，格式化可能会失败。这种情况下你可以在 IDE 的 `output` 窗口查看失败信息：

<img src="/static/medias/format-error.png" alt="格式化错误" />

---

## 重启语言服务

当你遇到语言服务异常时，可以唤出 VS Code 的命令面板（快捷键 `Ctrl+Shift+P` 或 `Cmd+Shift+P`），然后执行 `Qingkuai: Restart Language Server` 命令来重启语言服务：
<img src="/static/medias/restart-language-server.png" alt="重启语言服务" />

---

## 代码跳转

代码跳转是开发时经常需要用到的功能，这项功能在组件文件中有一些特有用法：

- 查找插槽定义：按住 meta 键并在组件一级子元素的 slot 属性上单击鼠标左键；
- 查找组件定义：按住 meta 键并在组件标签或嵌入脚本中的组件标识符上单击鼠标左键；
- 查找插槽引用：在 slot 标签上单击鼠标右键并选择 “Go to References”，或开启 “代码镜头” 功能；
- 查找组件引用：在嵌入语言标签上单击鼠标右键并选择 “Go to References”，或开启 “代码镜头” 功能；

---

## AI 代理

在 Qingkuai 项目中，人工智能可以作为开发辅助能力，帮助你更快完成组件搭建、代码补全、问题排查与文档理解。它并不替代编译器和语言服务本身，而是与现有工具链协同工作，降低重复劳动并提升开发效率。

Qingkuai 的 MCP 服务器由 [qingkuai-mcp-server](https://www.npmjs.com/package/qingkuai-mcp-server) 提供。它主要用于提升 Agent 的响应速度与稳定性，以及对 DSL 语法和组件文件的理解与生成能力。如果你安装了 [VS Code 扩展](docs://zh-cn/misc/language-features.md#ide-扩展)，在组件文件中使用 AI 功能时会自动连接到 MCP 服务器，无需额外配置。如果你希望在其他环境中使用或集成其 AI 能力，也可以直接接入该服务。
