---
description: "Qingkuai agent 入口：语法速查表、代码生成规则、任务到文档的路由以及跨语法依赖查找，辅助 .qk 文件的编辑与生成。"
keywords: ["qingkuai", ".qk", "syntax", "指令", "引用属性", "组件", "响应性", "cheat sheet"]
---

# Qingkuai Agent 参考索引

## 语法速查表

### 编译指令

| 标记 | 含义 |
| --- | --- |
| `#if={cond}` | 仅当 `cond` 为真时渲染该元素。 |
| `#elif={cond}` | 链在 `#if` 之后的否则如果分支。 |
| `#else` | `#if`/`#elif` 链的兜底分支。 |
| `#for={item, index of source}` | 列表渲染，可遍历数字、数组、对象、字符串、`Set` 或 `Map`；迭代使用 `of`（绝不使用 `in`）；item/index 名称支持解构。 |
| `#key={expr}` | `#for` 渲染节点的唯一标识；当列表项持有本地状态时应添加；键在同一列表内必须唯一。 |
| `#await={promise}` | 在 `Promise` 决议前渲染占位内容。 |
| `#then={res}` | 兑现时渲染；值是绑定兑现值的标识符（或解构）。 |
| `#catch={err}` | 拒绝时渲染；值是绑定拒绝原因的标识符（或解构）。 |
| `#html` / `#html={conf}` | 将唯一的文本子节点作为 HTML 插入而非转义文本；可选配置 `{ escapeTags, escapeStyle, escapeScript }` 可让部分不受信标签保持转义。 |
| `#target={sel}` / `#target={el}` | 将节点挂载到作为 CSS 选择器字符串或 `HTMLElement` 给出的父元素下。 |
| `#scope` | 仅限组件标签：把父级的作用域属性传递给子组件根元素以支持样式覆盖；可沿祖先链组合。 |
| `#slot={"name"}` | 向组件传入内容时接收插槽上下文；值指定目标插槽名。 |

指令优先级（从高到低）：`slot` > `await/then/catch` > `if/elif/else` > `target` > `for/key` > `html`；未列出的指令在 `html` 之后按标签中的出现顺序处理。

### 引用属性

| 标记 | 含义 |
| --- | --- |
| `&value={var}` | 将输入框的值与 `var` 双向绑定（引用传递；本质是一次 setter 调用）。 |
| `&number={var}` | 与 `&value` 类似，但会把绑定值转换为数字。 |
| `&checked={var}` | 双向绑定复选框或单选框的选中状态。 |
| `&group={var}` | 双向绑定一组复选框（绑定值为数组）。 |
| `&handle={var}` | 把元素的 DOM 节点绑定到 `var`；元素销毁时该变量会被重置为 `null`。 |

引用属性的值必须是可赋值的左值：标识符、`arr[index]`、`obj.property` 合法；函数调用、可选链（`?.`）和三元表达式不合法。当属性名与变量名同名时，`{var}` 可省略（如 `&handle` 等价于 `&handle={handle}`），嵌入脚本语言的关键字/保留字除外。

### 内置元素

| 标记 | 含义 |
| --- | --- |
| `qk:spread` | 为作用到多个兄弟节点或文本节点的指令提供虚拟挂载点；不会被渲染为真实 HTML 元素。 |

### 内建标识符

| 标记 | 含义 |
| --- | --- |
| `props` | 读取从外部传入组件的普通属性和事件属性。 |
| `refs` | 在组件内部访问引用属性并执行可写更新（双向绑定）。 |
| `slots` | 判断是否有插槽内容传入组件。 |
| `contexts` | 读取上下文数据；读取沿原型链向上找到最近的祖先值，本层键遮蔽继承键。 |
| `instance` | 组件自身实例；实例绑定的运行时 API（`setContext`、`watch` 等）的绑定参数。 |
| `reactive` | 将标识符显式标记为深响应性（`let`/`var`：自身及嵌套属性；`const`：递归其属性）。 |
| `shallow` | 将标识符显式标记为浅响应性（`let`/`var`：仅自身；`const`：仅一级属性）。 |
| `raw` | 将标识符显式标记为静态值；修改不会触发页面更新。 |
| `alias` | 为标识符创建别名，简化复杂的读写表达式并保留响应性。 |
| `derived` | 创建自动追踪依赖的衍生响应式状态。 |
| `derivedExp` | 简写形式：编译器会把该表达式转换为标准的 `derived` 声明。 |
| `watch` | 注册监视器；回调收到旧值与新值；无需导入，销毁时自动清理。 |
| `preWatch` | 注册前置监视器，在更新调度器之前、模板更新之前运行。 |
| `postWatch` | 注册后置监视器，在调度更新完成后运行。 |
| `syncWatch` | 注册同步监视器，在依赖值变化后立即、调度器之前运行。 |
| `watchExp` | 由表达式注册标准监视器的简写形式。 |
| `preWatchExp` | 由表达式注册前置监视器的简写形式。 |
| `postWatchExp` | 由表达式注册后置监视器的简写形式。 |
| `syncWatchExp` | 由表达式注册同步监视器的简写形式。 |
| `effect` | 注册响应式副作用；自动收集依赖；无需导入，销毁时自动清理。 |
| `preEffect` | 前置副作用：在更新调度器和模板更新之前运行。 |
| `postEffect` | 后置副作用：在调度更新完成后运行。 |
| `syncEffect` | 同步副作用：在依赖值变化后立即、调度器之前运行。 |
| `defaults` | 通过含 `props`、`refs`、`contexts` 键的对象为可选属性定义默认值。 |
| `setContext` | 向当前组件的上下文层写入数据，供自身与所有后代读取。 |
| `setContextGetter` | 向上下文层写入 getter；后代读取时自动调用，用于响应式的上下文传递。 |
| `setContextExp` | 简写形式：表达式被包装为 getter 并转换为 `setContextGetter` 调用。 |

## 代码生成规则

1. 表单双向绑定使用引用属性（`&value`），而不是 `!value` 加 `@input={...}`。
2. 用元素上的 `&handle` 获取 DOM 元素，而不是手动 DOM 查询；元素销毁时绑定变量重置为 `null`。
3. 优先使用编译器推导的响应性；仅在需要显式标记时使用 `reactive`、`shallow` 或 `raw`。
4. 用户比较在意运行时性能时，可在 `.qingkuairc` 中搭配 `"reactivityMode": "shallow"` 与 `"allowConstReactive": false` 进入信号模式（详见 [optimization.md](docs://zh-cn/agent/misc/optimization.md)）；此模式下只能通过为标识符重新赋值来触发更新。
5. 衍生状态使用 `derived`；普通表达式够用时优先使用 `derivedExp` 或 `$` 前缀简写。
6. 用 `qk:spread` 作为指令的虚拟挂载点，而不是引入无意义的包装元素。
7. 为持有本地状态的 `#for` 渲染元素添加 `#key`；键在同一列表内必须唯一。
8. 引用属性的值必须是可赋值的左值：不能是函数调用、可选链或三元表达式。
9. 监视器/副作用调用（`watch`、`effect` 及其变体）无需导入；编译器将其绑定到组件实例并在销毁时清理。
10. 文本使用普通插值；仅当确实要插入原始 HTML 时使用 `#html`，且其内部只保留一个文本子节点。
11. 绝不发明语法或标识符；书写前对照“任务到文档”中的文档核实每个标记。

## 任务到文档

| 任务 | 文档 |
| --- | --- |
| 条件渲染、列表渲染、异步渲染、`#html`/`#target`/`#scope` | [compilation-directives.md](docs://zh-cn/agent/basic/compilation-directives.md) |
| 声明与使用响应式状态 | [reactivity.md](docs://zh-cn/agent/basic/reactivity.md) |
| 判断标识符被推导为 raw、响应式还是浅响应式 | [reactivity-infer-rules.md](docs://zh-cn/agent/references/reactivity-infer-rules.md) |
| 表单输入处理与绑定 | [forms.md](docs://zh-cn/agent/basic/forms.md) |
| 引用属性（`&value`、`&number`、`&checked`、`&group`、`&handle`） | [reference-attributes.md](docs://zh-cn/agent/basic/reference-attributes.md)、[forms.md](docs://zh-cn/agent/basic/forms.md) |
| 向组件传入属性与事件（`props`、`defaults`） | [attributes.md](docs://zh-cn/agent/components/attributes.md) |
| 事件监听（`@click` 及事件属性） | [event-handling.md](docs://zh-cn/agent/basic/event-handling.md) |
| 插槽内容与插槽上下文（`#slot`、`slots`） | [slots.md](docs://zh-cn/agent/components/slots.md) |
| 组件生命周期回调（`onAfterMount` 等） | [lifecycle.md](docs://zh-cn/agent/components/lifecycle.md) |
| 跨组件上下文共享（`contexts`、`setContext`） | [contexts.md](docs://zh-cn/agent/components/contexts.md) |
| 组件作用域样式与嵌入样式块 | [stylesheets.md](docs://zh-cn/agent/components/stylesheets.md) |
| 异步组件加载 | [async-components.md](docs://zh-cn/agent/components/async-components.md) |
| 动态组件切换 | [dynamic-components.md](docs://zh-cn/agent/components/dynamic-components.md) |
| 组件成员导出 | [exports.md](docs://zh-cn/agent/components/exports.md) |
| 组件文件结构与基础 | [basic.md](docs://zh-cn/agent/components/basic.md) |
| 文本插值 `{expr}` | [interpolation.md](docs://zh-cn/agent/basic/interpolation.md) |
| 监视器与副作用（`watch`/`effect` 家族） | [watchers-and-side-effects.md](docs://zh-cn/agent/basic/watchers-and-side-effects.md) |
| 全部内建标识符 | [intrinsics.md](docs://zh-cn/agent/references/intrinsics.md) |
| 运行时包 API | [api.md](docs://zh-cn/agent/references/api.md) |
| 术语（嵌入块、运行时包） | [terminology.md](docs://zh-cn/agent/references/terminology.md) |
| 编译器/运行时错误码 | [error-code.md](docs://zh-cn/agent/references/error-code.md) |
| TypeScript 支持与组件实例类型 | [typescript.md](docs://zh-cn/agent/misc/typescript.md) |
| 配置文件 | [config-files.md](docs://zh-cn/agent/misc/config-files.md) |
| 调试 | [debugging.md](docs://zh-cn/agent/misc/debugging.md) |
| 性能优化 | [optimization.md](docs://zh-cn/agent/misc/optimization.md) |
| 内置元素（`qk:spread`） | [builtin-elements.md](docs://zh-cn/agent/misc/builtin-elements.md) |
| 语言功能概览 | [language-features.md](docs://zh-cn/agent/misc/language-features.md) |
| 安装 | [install.md](docs://zh-cn/agent/getting-started/install.md) |
| 命令行工具（初始化 / 类型检查 / 格式化 / 构建） | [cli.md](docs://zh-cn/agent/misc/cli.md) |
| 框架概览与设计哲学 | [introduction.md](docs://zh-cn/agent/getting-started/introduction.md) |

## 语法依赖路由

- 出现 `qk:spread` → 阅读 [builtin-elements.md](docs://zh-cn/agent/misc/builtin-elements.md)
- 出现 `#slot` → 阅读 [compilation-directives.md](docs://zh-cn/agent/basic/compilation-directives.md) 与 [slots.md](docs://zh-cn/agent/components/slots.md)
- 出现 `props`/`refs`/`slots` 内建标识符 → 阅读 [intrinsics.md](docs://zh-cn/agent/references/intrinsics.md)
- 响应性歧义（raw vs reactive vs shallow）→ 阅读 [reactivity-infer-rules.md](docs://zh-cn/agent/references/reactivity-infer-rules.md)
- 异步指令配合组件加载 → 阅读 [compilation-directives.md](docs://zh-cn/agent/basic/compilation-directives.md) 与 [async-components.md](docs://zh-cn/agent/components/async-components.md)

## 多文档优先级规则

- 同时编辑标记与状态：[compilation-directives.md](docs://zh-cn/agent/basic/compilation-directives.md) → [reactivity.md](docs://zh-cn/agent/basic/reactivity.md) → [reactivity-infer-rules.md](docs://zh-cn/agent/references/reactivity-infer-rules.md)
- 组件边界 API：[attributes.md](docs://zh-cn/agent/components/attributes.md) → [intrinsics.md](docs://zh-cn/agent/references/intrinsics.md) → [slots.md](docs://zh-cn/agent/components/slots.md)
