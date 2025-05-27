# Qingkuai Language Features

Qingkuai Language Features is the official language support package for the [QingKuai](a front-end framework) component file. It provides rich language features.

## Features

- Hover Tooltips with inline documentation
- Syntax Highlighting for `.qk` files and embedded expressions
- Code Completion for directives, component props, keywords, and built-ins
- Directive Support like `#for`, `#if`, `#await`, `#html`, `#target` and more
- Diagnostics with meaningful error/warning codes from both the compiler and runtime
- Document Formatting, Find References, Go to Definition, Rename Symbol, Code Lens, etc.

## Packages

This repo is organized into modular packages:

| Package             | Description                                             |
| ------------------- | ------------------------------------------------------- |
| `language-server`   | Language Server Protocol (LSP) implementation           |
| `language-service`  | Core logic for analyzing QingKuai component file        |
| `vscode-extension`  | VS Code integration built on top of the language server |
| `typescript-plugin` | TypeScript plugin for QingKuai-specific enhancements    |

Note that each package is independently published and versioned.

## Usage

To use Qingkuai language features in your editor:

1. Install the [Qingkuai VSCode extension](https://marketplace.visualstudio.com/items?itemName=qingkuai-tools.qingkuai-language-features).
2. Open a `.qk` file or create one.
3. Start coding — autocomplete, linting, and highlights should work immediately.

## Development

To set up this monorepo for local development:

```bash
git clone https://github.com/qingkuai-js/language-features.git qingkuai-language-features
cd qingkuai-language-features
pnpm install
pnpm run dev
```
