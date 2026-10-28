---
description: "Qingkuai MCP server (qingkuai-mcp-server): npx integration, six tools (doc search/read, project bootstrap, syntax check, compile, format), built-in prompts, docs:// resources, and the working protocol."
keywords:
    [
        "mcp",
        "qingkuai-mcp-server",
        "agent",
        "AI assistant",
        "npx",
        "search_qingkuai_docs",
        "check_qingkuai_syntax",
        "working protocol"
    ]
---

# MCP Server

The Qingkuai MCP server is `qingkuai-mcp-server` (npm package, no installation needed). It exposes official documentation search, syntax checking, compilation, and formatting to AI assistants. The documentation corpus and compiler are bundled in the package; no network access at runtime.

## Integration

```shell
npx qingkuai-mcp-server@latest
```

stdio transport; requires Node.js ≥ 18. Claude Desktop: add to `mcpServers` in `claude_desktop_config.json`. VS Code (Copilot Agent Mode): add to `servers` in `.vscode/mcp.json` at the project root — `"command": "npx"`, `"args": ["qingkuai-mcp-server@latest"]`. Other stdio-capable clients use the same structure.

## Tools

| Tool                                   | Purpose                                                                                                                                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search_qingkuai_docs`                 | Search official docs; accepts keywords, natural-language questions (English or Chinese), or syntax tokens (`#for`, `&value`, `qk:spread`); returns full matched sections with relatedDocs cross-references |
| `read_qingkuai_doc`                    | Read a document by `docs://` URI (e.g. `docs://basic/forms.md`); append a `#section` anchor for a single section; unknown URIs return the closest valid URIs                                               |
| `get_qingkuai_project_bootstrap_guide` | Preferred entry for install/init/scaffold tasks; returns official installation docs — never invent install commands                                                                                        |
| `check_qingkuai_syntax`                | Early-stage compilation checks (template structure, tag nesting, script errors, directive usage and attributes); returns errors, warnings, and type info without generating code                           |
| `compile_qingkuai`                     | Full compilation to JavaScript with optional sourcemap; `source` required, `hashId`/`debug`/`sourcemap` optional                                                                                           |
| `format_qingkuai_code`                 | Resolves the Prettier config from `filePath`, formats the component file, and writes it back                                                                                                               |

Remaining options of `check_qingkuai_syntax` and `compile_qingkuai` (`allowConstReactive`, `requireReactivityMark`, `reactivityMode`, `whitespace`, `interpretiveComments`, `preserveHtmlComments`) correspond to same-named options in the `.qingkuairc` runtime configuration; a few defaults differ — the tool parameter definitions are authoritative. The syntax check, compilation, and formatting tools share the same implementation as the CLI `check`/`format` commands.

## Prompts

- `qingkuai-code-generation-rules`: code-generation constraints when generating or editing component files (reference attributes first, minimal reactive declarations, no simulated two-way binding).
- `qingkuai-install-init-create-qingkuai-first`: install/init/scaffold tasks must follow the official `create-qingkuai` path — read the docs first, then provide commands.

## Documentation Resources and Working Protocol

- On startup, all documents are registered as `docs://` resources: the English corpus (`docs://basic/forms.md`), the Chinese corpus (`docs://zh-cn/basic/forms.md`), and the condensed agent reference layer (`docs://agent/index.md`). Search indexes both language corpora; Chinese queries mainly match the zh-cn corpus.
- The server sends a working protocol via the protocol `instructions` field: for syntax-related questions call `search_qingkuai_docs` first and base answers on the returned sections; use reference attributes (`&value`, `&number`, `&checked`, `&group`, `&handle`) for two-way binding; declare reactivity the way the user does (compiler inference or explicit marks, per the `reactivityMode`/`requireReactivityMark`/`allowConstReactive` settings), with `derived`/`derivedExp` for derived state; verify written code with `check_qingkuai_syntax` and do not finalize output while errors remain; use the project or global `@qingkuai/cli` for tasks the server does not cover, such as type checking; call `get_qingkuai_project_bootstrap_guide` first when creating projects.
