# Qingkuai Language Features

Qingkuai Language Features is the official language tooling workspace for QingKuai files (`.qk`).

It contains the full toolchain used by the VS Code extension, including:

- language grammar and syntax highlighting
- language service (analysis, completion, formatting, diagnostics)
- language server (LSP)
- TypeScript plugin integration

## Features

- Syntax Highlighting for `.qk` and embedded languages (`js/ts/css/sass/scss/less/stylus/postcss`)
- Code Completion for directives, attributes, events, and framework keywords
- Hover Tips and inline docs
- Diagnostics powered by compiler + language service analysis
- Go to Definition / References / Rename / Code Lens / Signature Help
- Document Formatting via `prettier` + `prettier-plugin-qingkuai`

## Workspace Packages

| Package                      | Description                                           |
| ---------------------------- | ----------------------------------------------------- |
| `packages/language-service`  | Core language intelligence and compiler-adapter logic |
| `packages/language-server`   | LSP server on top of language-service                 |
| `packages/vscode-extension`  | VS Code extension client + grammar + commands         |
| `packages/typescript-plugin` | TS server plugin for QingKuai-specific behavior       |

## Install Extension

Install from VS Code Marketplace:

- `qingkuai-tools.qingkuai-language-features`
- https://marketplace.visualstudio.com/items?itemName=qingkuai-tools.qingkuai-language-features

After installation, open any `.qk` file to activate the extension.

## Local Development

### Requirements

- Node.js 18+
- pnpm 8+

### Setup

```bash
git clone https://github.com/qingkuai-js/language-features.git
cd language-features
pnpm install
```

### Build

```bash
npm run build
```

This command builds all packages via Rollup and emits outputs into `dist` directories.

### Watch Mode

```bash
npm run dev
```

### Grammar Build (extension package)

```bash
cd packages/vscode-extension
npm run build:grammars
```

## Architecture Overview

1. VS Code extension starts and launches the QingKuai language server.
2. Extension configures the TypeScript plugin (`typescript-plugin-qingkuai`) for tsserver.
3. Language server delegates core analysis/format/diagnostics to `qingkuai-language-service`.
4. Language service integrates compiler output and framework-specific semantics.

## License

MIT
