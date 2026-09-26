# qingkuai-mcp-server

MCP server for [Qingkuai](https://qingkuai.dev) — provides AI agents with syntax documentation search, syntax checking, compilation, and code formatting tools for `.qk` files.

## Tools

| Tool | Description |
|------|-------------|
| `search_qingkuai_docs` | Search official Qingkuai syntax/reference docs (English, Chinese, or syntax tokens like `#for` / `&value`). Results include matched sections with full content inline and cross-reference links. |
| `read_qingkuai_doc` | Read a doc by its `docs://` URI; supports `#section` anchors for targeted reading. |
| `get_qingkuai_project_bootstrap_guide` | Entry point for install/init/scaffold tasks; returns authoritative setup docs. |
| `check_qingkuai_syntax` | Validate `.qk` source code syntax (template structure, script errors, directive usage) without full compilation. |
| `compile_qingkuai` | Compile `.qk` source to JavaScript with source maps. |
| `format_qingkuai_code` | Format a `.qk` file using Prettier with the Qingkuai plugin and write back to disk. |

The server also sends a working protocol via `instructions` on initialize (search docs first, base answers on retrieved sections, prefer reference attributes, verify with `check_qingkuai_syntax`), so hosts surface the workflow even without loading prompts.

## Prompts

| Prompt | Trigger scenario |
|--------|-----------------|
| `qingkuai-code-generation-rules` | Generating or editing `.qk` files — enforces reference attribute priority, reactive declaration minimization, and naming conventions. |
| `qingkuai-install-init-create-qingkuai-first` | Installing, initializing, or scaffolding a Qingkuai project — enforces `create-qingkuai` usage. |

## Usage

### Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "qingkuai": {
      "command": "npx",
      "args": ["qingkuai-mcp-server"]
    }
  }
}
```

### VS Code (Copilot Agent Mode)

Add to your `.vscode/mcp.json`:

```json
{
  "servers": {
    "qingkuai": {
      "command": "npx",
      "args": ["qingkuai-mcp-server"],
      "type": "stdio"
    }
  }
}
```

### Direct execution

```bash
npx qingkuai-mcp-server
```

## Requirements

- Node.js ≥ 18
- A Qingkuai project (see [Getting Started](https://qingkuai.dev/getting-started/installation))

## License

MIT
