# MCP Server

MCP (Model Context Protocol) is an open protocol that establishes standardized connections between AI assistants and external tools and data sources. Qingkuai provides an MCP server, [qingkuai-mcp-server](https://www.npmjs.com/package/qingkuai-mcp-server), which exposes official documentation search, syntax checking, compilation, and formatting as MCP tools for AI assistants such as [Claude](https://claude.ai/), [Copilot](https://github.com/features/copilot), and [Cursor](https://cursor.com/), so agents base component-file code on the official documentation instead of memory.

> [!TIP]
> If you have the [VS Code extension](docs://misc/language-features.md#ai-agents) installed, AI features in component files connect to the MCP server automatically with no extra configuration.

---

## Installation and Integration

The MCP server requires no separate installation — run it directly with `npx` (Node.js 18 or higher required):

```shell
➜ npx qingkuai-mcp-server@latest
```

To connect an AI client, add the following entry to its MCP configuration. In Claude Desktop, the configuration file is `claude_desktop_config.json`:

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

VS Code (Copilot Agent Mode) uses `.vscode/mcp.json` in the project root:

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

Other MCP clients that support the stdio transport can follow the same structure: point the launch command at `npx` and pass `qingkuai-mcp-server@latest` as the argument.

---

## Tools

The server provides six tools; the documentation corpus and the compiler they need are bundled in the package, so no network access to the documentation site is required at runtime:

> [!TIP]
> The syntax check, compilation, and formatting tools share the same implementation as the `check` and `format` commands of the [command line tool](docs://misc/cli.md).

| Tool                                 | Description                                                                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| search_qingkuai_docs                 | Search the official syntax and reference documentation; accepts English, Chinese, or syntax tokens (such as `#for`, `&value`) as queries       |
| read_qingkuai_doc                    | Read a document by its `docs://` URI, with anchor support for specific sections                                                                |
| get_qingkuai_project_bootstrap_guide | Authoritative entry point for installation, initialization, and scaffolding tasks; returns the official installation and project-creation docs |
| check_qingkuai_syntax                | Run early-stage compilation checks (template structure, script errors, directive usage) on component-file source without generating code       |
| compile_qingkuai                     | Compile component-file source to `JavaScript` through the full pipeline, with optional sourcemap                                               |
| format_qingkuai_code                 | Format a component file with Prettier and `prettier-plugin-qingkuai`, writing the result back to disk                                          |

### Documentation Search

`search_qingkuai_docs` searches the official Qingkuai reference documentation and is the authoritative source for questions about syntax, directives, attributes, events, reactivity, and components. Results include the full content of matched sections plus cross-reference links to related documents (relatedDocs):

| Parameter | Description                                                                                                                         | Default |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------- |
| query     | Search query — keywords, a natural-language question (English or Chinese), or syntax tokens (such as `#for`, `&value`, `qk:spread`) | —       |
| limit     | Maximum number of result groups, 1 to 8                                                                                             | 4       |

### Document Reading

`read_qingkuai_doc` reads a single document by its `docs://` URI:

| Parameter | Description                                                                                                                                                            | Default |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| uri       | Document URI returned by `search_qingkuai_docs`, e.g. `docs://basic/forms.md`; append an anchor to read a single section, e.g. `docs://basic/forms.md#two-way-binding` | —       |

> [!TIP]
> For an unknown URI, the result includes the closest valid URIs so the call can be corrected and retried.

### Project Bootstrap

`get_qingkuai_project_bootstrap_guide` is the entry point for creating or initializing a Qingkuai project. It returns officially confirmed installation and scaffolding docs and prevents agents from inventing install commands:

| Parameter | Description                             | Default                               |
| --------- | --------------------------------------- | ------------------------------------- |
| query     | Optional keywords                       | `getting started installation create` |
| limit     | Maximum number of result groups, 1 to 8 | 4                                     |

### Syntax Check

`check_qingkuai_syntax` runs early-stage compilation checks on component-file source, covering template structure and tag nesting, script syntax errors, and directive usage and attributes. It returns syntax errors, warnings, and type information together with error and warning counts, suitable for quick validation after generating or modifying component-file code:

| Parameter | Description                    | Default |
| --------- | ------------------------------ | ------- |
| source    | Component-file source to check | —       |

> [!TIP]
> Other options match the same-named options in the [runtime configuration](docs://misc/config-files.md).

### Compilation

`compile_qingkuai` runs the full compilation pipeline on component-file source — syntax validation (parsing and analysis), template compilation into render functions, reactivity detection and optimization, and sourcemap generation — and returns the compiled output (truncated beyond 500 characters), diagnostics, and mapping info:

| Parameter | Description                      | Default        |
| --------- | -------------------------------- | -------------- |
| source    | Component-file source to compile | —              |
| hashId    | Hash ID of the component         | auto-generated |
| debug     | Enable debug mode                | false          |
| sourcemap | Generate a sourcemap             | false          |

> [!TIP]
> Other compilation options correspond to the same-named options in the [runtime configuration](docs://misc/config-files.md); a few defaults may differ from the configuration file.

### Formatting

`format_qingkuai_code` formats a component file with [Prettier](https://prettier.io/) and [prettier-plugin-qingkuai](https://npmjs.org/package/prettier-plugin-qingkuai): it reads the file, resolves the Prettier configuration from that path (see [configuration files](docs://misc/config-files.md)), formats, and writes back to the same file, returning the write result and any formatting errors:

| Parameter | Description                                                           | Default |
| --------- | --------------------------------------------------------------------- | ------- |
| filePath  | Path of the component file to format (absolute or workspace-relative) | —       |

---

## Prompts

The server ships two prompts that clients can pull on demand to inject the corresponding workflow constraints:

| Name                                        | Trigger scenario                                                                                                                                   |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| qingkuai-code-generation-rules              | Generating or editing component files: enforces reference-attribute priority, minimal reactive declarations, and forbids simulated two-way binding |
| qingkuai-install-init-create-qingkuai-first | Installation, initialization, or scaffolding tasks: enforces the official `create-qingkuai` path — read the docs first, then provide commands      |

---

## Documentation Resources

On startup, the server registers all bundled documents as MCP resources exposed through the `docs://` protocol:

- The English and Chinese tutorial corpora, e.g. `docs://basic/forms.md` and `docs://zh-cn/basic/forms.md`
- The condensed agent reference layer, e.g. `docs://agent/index.md`

> [!TIP]
> Search covers both language corpora, and Chinese queries mainly match the `zh-cn` corpus. Clients that support resource reads can read documents directly by URI, and agents usually access the same content through the `read_qingkuai_doc` tool.

---

## Working Protocol

During the initialization handshake, the server sends a working agreement through the protocol's `instructions` field, which mainstream clients surface as behavioral guidance for agents:

1. For any question about Qingkuai syntax, directives, attributes, events, reactivity, or components, call `search_qingkuai_docs` first — never write component-file code from memory
2. Base answers on the document sections returned by search; use `read_qingkuai_doc` for a full document or a specific section
3. For two-way binding, prefer reference attributes (`&value`, `&number`, `&checked`, `&group`, `&handle`) instead of `!attr` with event listeners, or `querySelector`/`getElementById`
4. Declare reactivity according to the user's coding habits: let the compiler infer it when the user relies on inference, and keep explicit declarations with `reactive`, `shallow`, and `raw` when the user prefers them. Check the `reactivityMode`, `requireReactivityMark`, and `allowConstReactive` settings in the [runtime configuration](docs://misc/config-files.md) to decide the concrete form. Use `derived`/`derivedExp` for derived state
5. After writing or modifying component-file code, verify with `check_qingkuai_syntax`; if problems remain, investigate with `compile_qingkuai` — do not finalize output while errors remain. For tasks the server provides no tool for, such as type checking, use `@qingkuai/cli` installed in the project or globally (e.g. `qingkuai check --types`)
6. To create or initialize a project, call `get_qingkuai_project_bootstrap_guide` first and never invent install commands
