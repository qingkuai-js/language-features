# Debugging

Debugging is an essential part of locating and fixing issues during development. Qingkuai component files are compiled into standard JavaScript modules, so you can use browser DevTools, the [VS Code](https://code.visualstudio.com/) debugger, and tools like [Vite](https://vitejs.dev/) to inspect component logic, reactive state, and rendering behavior. This article covers common debugging techniques for Qingkuai projects.

---

## Source Maps

In development mode, the compiler generates [source maps](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/SourceMap) for component files by default, mapping compiled output back to the original component file across two dimensions:

- **Script mapping**: Maps compiled JavaScript code back to the script block or template interpolation in the component file, so you can inspect variables and set breakpoints in the original source.
- **Style mapping**: Maps compiled CSS back to the style block in the component file, so the browser's Styles panel shows the original rules instead of the compiled stylesheet.

---

## Prerequisites

- Make sure `JavaScript source maps` and `CSS source maps` are enabled in your browser's DevTools settings.
- If you use [vite-plugin-qingkuai](https://www.npmjs.com/package/vite-plugin-qingkuai), source maps are enabled by default in development mode. For other build tools, refer to their documentation for configuration.

---

## Script Debugging

For code inside embedded script blocks and template interpolations, you can open the corresponding component file in the browser DevTools `Sources` panel and set breakpoints there:
<img src="/static/medias/script-debugging.png" alt="Script debugging" />

### Reactive Values

In development mode, the compiler preserves the original identifiers of reactive values. In the DevTools `Scope` panel, you will notice that each reactive identifier has a corresponding wrapper value (usually prefixed with `_`), which is the actual reactive value used by the compiler internally. You can ignore it during debugging — the compiler-generated debug code automatically syncs the original identifier whenever the reactive value changes, so you can always focus solely on the original identifier:
<img src="/static/medias/reactivity-debugging.png" alt="Reactive value debugging" />

### Directive Context

In development mode, the compiler attaches debug information to context identifiers created by directives, giving you a clearer picture of the directive's execution context:
<img src="/static/medias/directive-debugging.png" alt="Directive context debugging" />

### Interpolation Block Updates

As you may have noticed from the screenshots above, the compiler creates mapping points at the start and end of each interpolation block. This allows you to clearly see the state of the DOM before and after an update, helping you better understand the component's update process.

<div class="custom-block tip">
    If a tag's content contains multiple interpolation blocks, the start of the first block and the end of the last block correspond to the states before and after the DOM operation, respectively.
</div>

---

## Style Debugging

For style blocks in component files, you can inspect element styles in the browser DevTools `Elements` panel. Click the file path next to a rule to navigate to the original style in the component file:
<img src="/static/medias/style-debugging-1.png" alt="Style debugging" style="width: 60%; margin-left: 20%;" />

This will jump to the `Sources` panel and highlight the corresponding rule in the style block:
<img src="/static/medias/style-debugging-2.png" alt="Style debugging" />
