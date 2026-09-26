---
description: "Qingkuai 语言功能：基于 LSP 的语言服务、VS Code 扩展、Emmet 语法差异、格式化、语言服务重启、代码导航，以及面向 AI agent 的 MCP 服务器。"
keywords: ["language features", "LSP", "vscode", "emmet", "formatting", "navigation", "MCP", "语言服务"]
---

# 语言功能

Qingkuai 不向编译器塞入复杂语法扩展，而是通过基于 LSP 的语言服务提供丰富的语言功能：类型推导、智能补全、诊断、快速导航、语义高亮——覆盖组件属性、插槽、样式作用域、指令与引用传递等框架能力，并在保持语法简洁的同时提升开发体验与类型安全。

## 规则

1. IDE 支持以 VS Code 扩展发布（扩展视图搜索 `Qingkuai` / VS Code Marketplace）；IDE 问题请提交到 `language-features` 仓库。
2. 组件文件支持 Emmet，但属性移除例外：因为 `!` 与动态属性冲突，移除属性用 `-`——`input[-type]` 创建不带 `type` 的 `input`；`input[!type]` 创建动态属性 `<input !type={}>`。
3. 文档格式化由 `prettier-plugin-qingkuai` 实现；文件存在语法错误时格式化可能失败——检查 IDE 输出面板。
4. 语言服务行为异常时，在命令面板执行 `Qingkuai: Restart Language Server` 重启。
5. 代码导航：按住修饰键单击组件一级子元素上的 `slot` 属性查找插槽定义；按住修饰键单击组件标签或脚本中的组件标识符查找组件定义；右键 `slot` 标签 →"转到引用"查找插槽引用；右键嵌入语言标签 →"转到引用"查找组件引用（或启用 Code Lens）。
6. AI agent 通过 `qingkuai-mcp-server` 包集成，主要用于提升 Agent 的响应速度与稳定性，以及对 DSL 语法和组件文件的理解与生成能力；安装 VS Code 扩展后，组件文件内的 AI 功能自动连接该 MCP 服务器——无需额外配置，其他环境也可直接接入该服务。

## 参见

- [配置文件](docs://zh-cn/agent/misc/config-files.md)
- [调试](docs://zh-cn/agent/misc/debugging.md)
