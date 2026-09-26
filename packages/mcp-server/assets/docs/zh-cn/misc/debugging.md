# 调试

在开发过程中，调试是定位和修复问题的关键环节。Qingkuai 的组件文件会被编译为标准 JavaScript 模块，因此你可以借助浏览器开发者工具、[VS Code](https://code.visualstudio.com/) 调试器和 [Vite](https://vitejs.dev/) 等工具，排查组件逻辑、响应式状态与渲染行为。本文将介绍 Qingkuai 项目中常用的调试方法与技巧。

---

## 源码映射

在开发模式下，编译器默认会为组件文件生成源码映射（[SourceMap](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Reference/Headers/SourceMap)），将编译结果映射回原始组件文件，涵盖脚本与样式两个维度：

- **脚本映射**：将编译后的 `JavaScript` 代码映射回组件文件的脚本块或模板插值处，便于在源码中查看变量并设断点。
- **样式映射**：将构建后的 `CSS` 映射回组件文件的样式块，便于在浏览器样式面板定位原始规则，而不是编译后样式表。

---

## 先决条件

- 确保浏览器开发者工具中的 `JavaScript source maps` 以及 `CSS source maps` 选项已启用。
- 如果你使用 [vite-plugin-qingkuai](https://www.npmjs.com/package/vite-plugin-qingkuai)，开发模式下源码映射已默认启用；其他构建工具请参考其文档进行配置。

---

## 脚本调试

对于嵌入脚本块和模板插值中的代码，你可以在浏览器开发者工具的 `Sources` 面板中打开对应的组件文件并设置断点：
<img src="/static/medias/script-debugging.png" alt="脚本调试" />

### 响应式值

在开发模式下，编译器会保留响应式值的原始标识符。在开发者工具的 `Scope` 面板中，你会看到每个响应式标识符还存在一个对应的包装值（通常以 `_` 开头），那才是编译器实际使用的响应式值。调试时无需关注它，编译器生成的调试代码会在响应式值发生改变时同步更新原始标识符，因此你始终只需关注原始标识符即可：
<img src="/static/medias/reactivity-debugging.png" alt="响应式值调试" />

### 指令上下文

在开发模式下，编译器会为指令创建的上下文标识符附加调试信息，便于你更清晰地了解指令的执行上下文：
<img src="/static/medias/directive-debugging.png" alt="指令上下文调试" />

### 插值块的更新

通过上面的图片你可能已经注意到，在组件文件中，编译器会在每个插值块的开头和结尾分别创建映射点。这是为了在调试时能够清晰地看到 DOM 操作前后的状态，帮助你更好地理解组件的更新过程。

> [!TIP]
> 若标签内容存在多个插值块，则第一个插值块的开头和最后一个插值块的结尾分别对应 DOM 操作前后的状态。

---

## 样式调试

对于组件文件中的样式块，你可以在浏览器开发者工具的 `Elements` 面板中查看元素的样式规则，点击规则旁的文件路径即可定位到组件文件中的原始样式：
<img src="/static/medias/style-debugging-1.png" alt="样式调试" style="width: 60%; margin-left: 20%;" />

点击后将跳转至 `Sources` 面板，并定位到样式块的对应规则：
<img src="/static/medias/style-debugging-2.png" alt="样式调试" />
