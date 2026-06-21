# Language Features

Qingkuai does not build complex syntax extensions into the compiler. Instead, it provides rich language features through an [LSP](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/)-based language service. These features include type inference, intelligent completion, diagnostics, quick navigation, and semantic highlighting, covering framework capabilities such as component attributes, slots, style scoping, directives, and reference passing. With LSP, Qingkuai keeps syntax concise while significantly improving developer experience and type safety.

---

## IDE Extensions

Currently, we only publish the extension for [VS Code](https://code.visualstudio.com). You can install it from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=qingkuai-tools.qingkuai-language-features) or by searching for `Qingkuai` in the VS Code Extensions view.

<img src="/static/medias/extension.png" alt="VS Code extension" />

<div class="custom-block tip">
    If you encounter IDE-related issues, please submit an issue in Qingkuai's <a href="https://github.com/qingkuai-js/language-features">language-features</a> repository.
</div>

---

## Emmet

Qingkuai language service provides solid [Emmet](https://emmet.io) support. However, because dynamic attributes conflict with Emmet's attribute-removal syntax, component files use `-` to remove attributes. The example below creates an `input` tag without a `type` attribute in a component file:

```txt
input[-type]
```

The original syntax:

```txt
input[!type]
```

creates a dynamic attribute:

```qk
<input !type={}>
```

---

## Formatting

Qingkuai language service includes built-in document formatting, implemented by [prettier-plugin-qingkuai](https://www.npmjs.com/package/prettier-plugin-qingkuai). If a component file contains syntax errors, formatting may fail. In that case, check the IDE `output` panel:

<img src="/static/medias/format-error.png" alt="formatting error" />

---

## Restart Language Service

When language service behavior is abnormal, open the VS Code command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`), then run `Qingkuai: Restart Language Server` to restart the language service:

<img src="/static/medias/restart-language-server.png" alt="restart language service" />

---

## Code Navigation

Code navigation is frequently used during development, and has some framework-specific usage in component files:

- Find slot definitions: Hold down the meta key and left-click the `slot` attribute on a first-level child element of a component;
- Find component definitions: Hold down the meta key and left-click a component tag or a component identifier in an embedded script;
- Find slot references: Right-click a `slot` tag and select "Go to References", or enable Code Lens;
- Find component references: Right-click an embedded language tag and select "Go to References", or enable Code Lens;

---

## AI Agents

In Qingkuai projects, AI can be used as a development assistant to help you build components faster, complete code, troubleshoot issues, and understand documentation. It does not replace the compiler or language service. Instead, it works alongside the existing toolchain to reduce repetitive work and improve development efficiency.

Qingkuai's MCP server is provided through [qingkuai-mcp-server](https://www.npmjs.com/package/qingkuai-mcp-server). It is mainly used to improve agent response speed and stability, and to strengthen understanding and generation for DSL syntax and component files. If you have installed the [VS Code extension](docs://misc/language-features.md#ide-extensions), AI features in component files will automatically connect to the MCP server with no extra configuration. If you want to use or integrate these AI capabilities in other environments, you can connect to the same service directly.
