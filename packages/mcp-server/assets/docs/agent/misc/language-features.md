---
description: "Qingkuai language features: LSP-based service, VS Code extension, Emmet syntax difference, formatting, language-server restart, code navigation, and the MCP server for AI agents."
keywords: ["language features", "LSP", "vscode", "emmet", "formatting", "navigation", "MCP", "语言服务"]
---

# Language Features

Qingkuai keeps the compiler free of complex syntax extensions and ships rich language features through an LSP-based language service: type inference, intelligent completion, diagnostics, quick navigation, semantic highlighting — covering component attributes, slots, style scoping, directives, and reference passing, while keeping syntax concise and improving developer experience and type safety.

## Rules

1. IDE support is published as a VS Code extension (`Qingkuai` in the Extensions view / VS Code Marketplace); report IDE issues in the `language-features` repository.
2. Emmet works in component files, EXCEPT attribute removal: because `!` conflicts with dynamic attributes, use `-` to remove attributes — `input[-type]` creates an `input` without `type`; `input[!type]` creates a dynamic attribute `<input !type={}>`.
3. Document formatting is implemented by `prettier-plugin-qingkuai`; formatting may fail when a file contains syntax errors — check the IDE output panel.
4. When the language service misbehaves, run `Qingkuai: Restart Language Server` from the command palette.
5. Code navigation: meta-click the `slot` attribute on a first-level child of a component to find slot definitions; meta-click a component tag or component identifier in script to find component definitions; right-click a `slot` tag → "Go to References" for slot references; right-click an embedded language tag → "Go to References" for component references (or enable Code Lens).
6. AI agents integrate through the `qingkuai-mcp-server` package, mainly to improve agent response speed and stability, and to strengthen understanding and generation for DSL syntax and component files; with the VS Code extension installed, AI features in component files connect to the MCP server automatically — no extra configuration — and the service can also be connected directly from other environments.

## See also

- [Configuration Files](docs://agent/misc/config-files.md)
- [Debugging](docs://agent/misc/debugging.md)
