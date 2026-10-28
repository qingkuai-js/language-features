# MCP 服务器

MCP（Model Context Protocol，模型上下文协议）是一个开放协议，用于在 AI 助手与外部工具、数据源之间建立标准化的连接。Qingkuai 提供了 MCP 服务器 [qingkuai-mcp-server](https://www.npmjs.com/package/qingkuai-mcp-server)，它面向[组件文件](docs://zh-cn/references/terminology.md#组件文件)，将官方语法文档检索、语法检查、编译与格式化能力以 MCP 工具的形式提供给 AI 助手（如 [Claude](https://claude.ai/)、[Copilot](https://github.com/features/copilot)、[Cursor](https://cursor.com/) 等），让 Agent 在编写组件文件代码时依据官方文档而非记忆作答。

> [!TIP]
> 如果你安装了 [VS Code 扩展](docs://zh-cn/misc/language-features.md#ai-代理)，在组件文件中使用 AI 功能时会自动连接到 MCP 服务器，无需额外配置。

---

## 安装与接入

MCP 服务器无需单独安装，通过 `npx` 直接运行即可，要求 Node.js 18 或更高版本：

```shell
➜ npx qingkuai-mcp-server@latest
```

在 AI 客户端的 MCP 配置中添加以下条目即可接入。Claude Desktop 的配置文件为 `claude_desktop_config.json`：

```json
{
    "mcpServers": {
        "qingkuai": {
            "command": "npx",
            "args": ["qingkuai-mcp-server@latest"]
        }
    }
}
```

VS Code（Copilot Agent Mode）在项目根目录的 `.vscode/mcp.json` 中配置：

```json
{
    "servers": {
        "qingkuai": {
            "command": "npx",
            "args": ["qingkuai-mcp-server@latest"],
            "type": "stdio"
        }
    }
}
```

其他支持 stdio 传输的 MCP 客户端可参照上述结构接入，将启动命令指向 `npx` 并传入 `qingkuai-mcp-server@latest` 作为参数即可。

---

## 工具

服务器提供 6 个工具，所需的文档语料与编译器都内置于包中，运行时不依赖对文档站点的网络访问：

> [!TIP]
> 语法检查、编译与格式化三个工具与[命令行工具](docs://zh-cn/misc/cli.md)中的 `check`、`format` 命令同源。

| 工具                                 | 描述                                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| search_qingkuai_docs                 | 检索官方语法与参考文档，支持英文、中文或语法 token（如 `#for`、`&value`）作为检索词 |
| read_qingkuai_doc                    | 按 `docs://` URI 读取文档，支持锚点定位到具体章节                                   |
| get_qingkuai_project_bootstrap_guide | 安装、初始化与脚手架任务的权威入口，返回官方安装与创建项目的文档                    |
| check_qingkuai_syntax                | 对组件文件源码执行早期编译校验（模板结构、脚本错误、指令用法），不生成代码          |
| compile_qingkuai                     | 将组件文件源码完整编译为 `JavaScript`，支持生成 sourcemap                           |
| format_qingkuai_code                 | 基于 Prettier 与 `prettier-plugin-qingkuai` 格式化组件文件并写回磁盘                |

### 文档检索

`search_qingkuai_docs` 检索 Qingkuai 官方参考文档，是关于语法、指令、属性、事件、响应式与组件等问题的权威来源。结果包含命中章节的完整内容，以及关联文档（relatedDocs）的跨引用链接：

| 参数  | 描述                                                                                       | 默认值 |
| ----- | ------------------------------------------------------------------------------------------ | ------ |
| query | 检索词，接受关键词、自然语言问题（中英文）或语法 token（如 `#for`、`&value`、`qk:spread`） | —      |
| limit | 返回的结果分组数上限，取值 1 到 8                                                          | 4      |

### 读取文档

`read_qingkuai_doc` 按 `docs://` URI 读取一份文档：

| 参数 | 描述                                                                                                                                             | 默认值 |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| uri  | 由 `search_qingkuai_docs` 返回的文档 URI，如 `docs://basic/forms.md`；在末尾追加锚点可只读取某一章节，如 `docs://basic/forms.md#two-way-binding` | —      |

> [!TIP]
> 传入未知的 URI 时，返回结果会附带最接近的有效 URI 列表，便于修正后重试。

### 项目引导

`get_qingkuai_project_bootstrap_guide` 是创建或初始化 Qingkuai 项目类任务的入口，返回经过官方确认的安装与脚手架文档，避免 Agent 编造安装命令：

| 参数  | 描述                              | 默认值                                |
| ----- | --------------------------------- | ------------------------------------- |
| query | 可选关键词                        | `getting started installation create` |
| limit | 返回的结果分组数上限，取值 1 到 8 | 4                                     |

### 语法检查

`check_qingkuai_syntax` 对组件文件源码执行早期编译校验，覆盖模板结构与标签嵌套、脚本语法错误、指令用法与属性，返回语法错误、警告与类型信息，以及错误与警告的数量汇总，适合在生成或修改组件文件代码后做快速验证：

| 参数   | 描述                 | 默认值 |
| ------ | -------------------- | ------ |
| source | 待检查的组件文件源码 | —      |

> [!TIP]
> 其余选项与[运行配置](docs://zh-cn/misc/config-files.md)中的同名选项一致。

### 编译

`compile_qingkuai` 对组件文件源码执行完整编译管线：语法校验（解析与分析）、模板编译为渲染函数、响应性检测与优化、生成 sourcemap，返回编译产物（超过 500 字符时截断展示）、诊断信息与映射信息：

| 参数      | 描述                 | 默认值   |
| --------- | -------------------- | -------- |
| source    | 待编译的组件文件源码 | —        |
| hashId    | 组件的 Hash ID       | 自动生成 |
| debug     | 启用调试模式         | false    |
| sourcemap | 生成 sourcemap       | false    |

> [!TIP]
> 其余编译选项与[运行配置](docs://zh-cn/misc/config-files.md)中的同名选项对应，个别默认值可能与配置文件不同。

### 格式化

`format_qingkuai_code` 基于 [Prettier](https://prettier.io/) 与 [prettier-plugin-qingkuai](https://npmjs.org/package/prettier-plugin-qingkuai) 格式化一个组件文件：读取文件内容，按该路径解析 Prettier 配置（见[配置文件](docs://zh-cn/misc/config-files.md)），格式化后写回同一文件，返回写回结果与格式化过程中的错误：

| 参数     | 描述                                                 | 默认值 |
| -------- | ---------------------------------------------------- | ------ |
| filePath | 待格式化的组件文件路径（绝对路径或相对工作区的路径） | —      |

---

## 提示词

服务器内置了两个提示词（Prompts），客户端可按场景主动拉取，为 Agent 注入对应的工作流约束：

| 名称                                        | 触发场景                                                                           |
| ------------------------------------------- | ---------------------------------------------------------------------------------- |
| qingkuai-code-generation-rules              | 生成或编辑组件文件：约束引用属性优先、响应式声明最小化、禁止模拟双向绑定等生成规则 |
| qingkuai-install-init-create-qingkuai-first | 安装、初始化或脚手架任务：强制走 `create-qingkuai` 的官方路径，先读文档再提供命令  |

---

## 文档资源

服务器在启动时将内置的全部文档注册为 MCP 资源（Resources），以 `docs://` 协议暴露：

- 英文与中文两套正文语料，如 `docs://basic/forms.md` 与 `docs://zh-cn/basic/forms.md`
- 面向 Agent 的精简参考层，如 `docs://agent/index.md`

> [!TIP]
> 检索时中英文语料都在索引范围内，中文问题主要命中 `zh-cn` 语料。支持资源读取的客户端可以直接按 URI 读取，Agent 通常通过 `read_qingkuai_doc` 工具访问同一批内容。

---

## 工作协议

服务器在初始化握手时通过协议的 `instructions` 字段下发一份工作约定，主流客户端会将其作为 Agent 的行为指引：

1. 任何关于 Qingkuai 语法、指令、属性、事件、响应式或组件的问题，先调用 `search_qingkuai_docs`，不要凭记忆书写组件文件代码
2. 回答基于检索返回的文档章节，需要完整文档或特定章节时使用 `read_qingkuai_doc`
3. 双向绑定优先使用引用属性（`&value`、`&number`、`&checked`、`&group`、`&handle`），而不是 `!attr` 搭配事件监听，或 `querySelector`/`getElementById`
4. 按照用户的编写习惯声明响应性：用户习惯依赖编译器推导时，尽量交由编译器推导；用户习惯显式声明时，尽量使用 `reactive`、`shallow`、`raw` 显式标记，并结合用户在[运行配置](docs://zh-cn/misc/config-files.md)中设置的 `reactivityMode`、`requireReactivityMark`、`allowConstReactive` 确定具体声明方式。派生状态使用 `derived`、`derivedExp`
5. 写入或修改组件文件代码后用 `check_qingkuai_syntax` 验证，问题未消除时用 `compile_qingkuai` 进一步排查，存在错误时不要输出最终结果；需要类型检查等服务器未提供工具的任务时，使用项目中或用户全局安装的 `@qingkuai/cli`（如 `qingkuai check --types`）完成
6. 创建或初始化项目时先调用 `get_qingkuai_project_bootstrap_guide`，不凭空编造安装命令
