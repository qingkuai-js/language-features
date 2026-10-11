---
description: "Qingkuai debugging: source maps for script and style blocks, reactive identifier wrappers in DevTools, directive context debug info, and interpolation update mapping points."
keywords: ["debug", "debugging", "source map", "devtools", "breakpoint", "调试"]
---

# Debugging

Component files compile to standard JavaScript modules, so browser DevTools, the VS Code debugger, and Vite inspect component logic, reactive state, and rendering behavior directly.

## Rules

1. In development mode the compiler generates source maps by default, in two dimensions: **script mapping** (compiled JS back to script blocks / template interpolations — set breakpoints in the original source) and **style mapping** (built CSS back to the style block — the Styles panel shows original rules).
2. Enable `JavaScript source maps` and `CSS source maps` in browser DevTools settings; with `vite-plugin-qingkuai` they are on by default in development mode.
3. In development mode the compiler preserves original identifiers of reactive values. The DevTools `Scope` panel also shows a compiler-internal wrapper value (usually `_`-prefixed) — ignore it; debug code keeps the original identifier in sync automatically.
4. The compiler attaches debug information to directive-created context identifiers, clarifying each directive's execution context.
5. Mapping points are created at the start and end of every interpolation block, showing DOM state before/after operations. With multiple interpolation blocks in one tag's content, the first block's start and the last block's end correspond to the before/after DOM states.
6. For styles, click the file path next to a rule in the `Elements` panel to jump to the original rule in the component file (`Sources` panel).

## Examples

Typical workflow: open the component file in DevTools `Sources`, set a breakpoint inside the script block, trigger the update, then inspect original reactive identifiers in `Scope` — not their `_`-prefixed internal wrappers.

## See also

- [Reactivity](docs://agent/basic/reactivity.md)
- [Language Features](docs://agent/misc/language-features.md)
