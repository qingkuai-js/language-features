---
description: "Qingkuai MCP 服务器（qingkuai-mcp-server）：npx 接入方式、六个工具（文档检索/读取/项目引导/语法检查/编译/格式化）、内置提示词、docs:// 文档资源与工作协议。"
keywords:
    [
        "mcp",
        "qingkuai-mcp-server",
        "agent",
        "AI 助手",
        "npx",
        "search_qingkuai_docs",
        "check_qingkuai_syntax",
        "工作协议"
    ]
---

# MCP 服务器

Qingkuai 的 MCP 服务器为 `qingkuai-mcp-server`（npm 包名，无需安装），向 AI 助手提供官方文档检索、语法检查、编译与格式化能力。文档语料与编译器内置于包中，运行时不访问网络。

## 接入

```shell
npx qingkuai-mcp-server@latest
```

stdio 传输；要求 Node.js ≥ 18。Claude Desktop 写入 `claude_desktop_config.json` 的 `mcpServers`，VS Code（Copilot Agent Mode）写入项目根 `.vscode/mcp.json` 的 `servers`：`"command": "npx"`、`"args": ["qingkuai-mcp-server@latest"]`。其他支持 stdio 的客户端结构相同。

## 工具

| 工具                                   | 用途                                                                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `search_qingkuai_docs`                 | 检索官方文档；接受关键词、中英文自然语言问题或语法 token（`#for`、`&value`、`qk:spread`）；返回命中章节全文与 relatedDocs 跨引用 |
| `read_qingkuai_doc`                    | 按 `docs://` URI 读文档（如 `docs://basic/forms.md`）；URI 追加 `#锚点` 只读单节；未知 URI 返回最接近的有效 URI                  |
| `get_qingkuai_project_bootstrap_guide` | 安装/初始化/脚手架任务首选；返回官方安装与脚手架文档，禁止编造安装命令                                                           |
| `check_qingkuai_syntax`                | 早期编译校验（模板结构、标签嵌套、脚本错误、指令用法与属性），返回错误、警告与类型信息，不生成代码                               |
| `compile_qingkuai`                     | 完整编译为 JavaScript 并可选生成 sourcemap；`source` 必填，`hashId`/`debug`/`sourcemap` 可选                                     |
| `format_qingkuai_code`                 | 按 `filePath` 解析 Prettier 配置，格式化组件文件并写回                                                                           |

`check_qingkuai_syntax` 与 `compile_qingkuai` 的其余选项（`allowConstReactive`、`requireReactivityMark`、`reactivityMode`、`whitespace`、`interpretiveComments`、`preserveHtmlComments`）与 `.qingkuairc` 运行配置同名对应，个别默认值不同，以工具参数定义为准。语法检查/编译/格式化与 CLI 的 `check`/`format` 命令同源。

## 提示词

- `qingkuai-code-generation-rules`：生成或编辑组件文件时的代码生成约束（引用属性优先、响应式声明最小化、禁止模拟双向绑定）。
- `qingkuai-install-init-create-qingkuai-first`：安装/初始化/脚手架任务强制走 `create-qingkuai` 官方路径，先读文档再提供命令。

## 文档资源与工作协议

- 启动时全部文档注册为 `docs://` 资源：英文语料（`docs://basic/forms.md`）、中文语料（`docs://zh-cn/basic/forms.md`）、agent 精简参考层（`docs://agent/index.md`）；检索时中英文语料均在索引内，中文问题主要命中 zh-cn 语料。
- 服务器经协议 `instructions` 下发工作协议：语法相关问题先调 `search_qingkuai_docs`，回答基于返回章节；双向绑定用 `&value`/`&number`/`&checked`/`&group`/`&handle` 引用属性；按用户习惯声明响应性（依赖编译器推导或显式标记，并结合 `reactivityMode`/`requireReactivityMark`/`allowConstReactive` 配置确定），派生状态用 `derived`/`derivedExp`；写码后用 `check_qingkuai_syntax` 验证，存在错误不输出最终结果；需类型检查等服务器未覆盖的任务时用项目中或全局安装的 `@qingkuai/cli`；建项目先调 `get_qingkuai_project_bootstrap_guide`。
