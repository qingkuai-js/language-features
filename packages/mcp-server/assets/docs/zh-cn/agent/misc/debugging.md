---
description: "Qingkuai 调试：脚本与样式块的 source map、DevTools 中的响应式标识符包装、指令上下文调试信息，以及插值块更新的映射点。"
keywords: ["debug", "debugging", "source map", "devtools", "breakpoint", "调试"]
---

# 调试

组件文件编译为标准 JavaScript 模块，浏览器 DevTools、VS Code 调试器与 Vite 可以直接检查组件逻辑、响应式状态与渲染行为。

## 规则

1. 开发模式下编译器默认生成 source map，覆盖两个维度：**脚本映射**（编译后 JS 映射回脚本块/模板插值——在原始源码上打断点）与**样式映射**（构建后 CSS 映射回样式块——Styles 面板显示原始规则）。
2. 在浏览器 DevTools 设置中开启 `JavaScript source maps` 与 `CSS source maps`；使用 `vite-plugin-qingkuai` 时开发模式默认开启。
3. 开发模式下编译器保留响应式值的原始标识符。DevTools `Scope` 面板中还会看到编译器内部的包装值（通常带 `_` 前缀）——调试时忽略它；调试代码会在响应式值变化时自动同步原始标识符。
4. 编译器为指令创建的上下文标识符附加调试信息，清晰呈现每条指令的执行上下文。
5. 每个插值块的首尾都会创建映射点，展示 DOM 操作前后的状态。一个标签内容含多个插值块时，第一个块的开头与最后一个块的结尾对应 DOM 操作前后的状态。
6. 样式方面：在 `Elements` 面板点击规则旁的文件路径，可跳转到组件文件中的原始规则（`Sources` 面板）。

## 示例

典型流程：在 DevTools `Sources` 中打开组件文件，在脚本块内打断点，触发更新，然后在 `Scope` 中检查原始响应式标识符——而不是带 `_` 前缀的内部包装。

## 参见

- [响应性](docs://zh-cn/agent/basic/reactivity.md)
- [语言功能](docs://zh-cn/agent/misc/language-features.md)
