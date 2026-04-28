# qingkuai-mcp-server

MCP server for [Qingkuai](https://qingkuai.dev) — provides AI agents with syntax documentation search, syntax checking, compilation, and code formatting tools for `.qk` files.

## Tools

| Tool | Description |
|------|-------------|
| `search_qingkuai_docs` | Search official Qingkuai syntax/reference docs. Always call this before falling back to website search. |
| `check_qingkuai_syntax` | Validate `.qk` source code syntax (template structure, script errors, directive usage) without full compilation. |
| `compile_qingkuai` | Compile `.qk` source to JavaScript with source maps. |
| `format_qingkuai_code` | Format a `.qk` file using Prettier with the Qingkuai plugin and write back to disk. |

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
