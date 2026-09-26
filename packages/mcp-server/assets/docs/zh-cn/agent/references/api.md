---
description: "Qingkuai 运行时与编译器包 API 参考：实例绑定的运行时 API、上下文操作、响应性控制、状态/调度函数，以及编译器入口导出。"
keywords: ["api", "runtime package", "qingkuai", "compiler", "mountApp", "nextTick", "运行时"]
---

# API 参考

API 按入口包划分，便于按需引入并保持清晰的职责边界：运行时包 `qingkuai` 与编译器包 `qingkuai/compiler`。内部包 `qingkuai/internal` 面向框架内部实现，通常不建议业务代码直接依赖。

## 运行时包

### 类型导出

`BoundEffectFunc`、`BoundLifecycleFunc`、`BoundSetContextFunc`、`BoundSetContextGetterFunc`、`BoundWatchFunc`、`ComponentContexts`、`ComponentExports`、`ComponentInstance`、`ComponentProps`、`ComponentRefs`、`ComponentShape`、`ComponentSlots`、`DeclareComponent`、`EffectCallback`、`EffectHandle`、`HtmlBlockOptions`、`WatchCallback` —— 用法见 TypeScript 支持。

### 实例绑定 API

| 分组 | 导出 | 外部调用规则 |
|---|---|---|
| 生命周期 | `onAfterMount`、`onBeforeUpdate`、`onAfterUpdate`、`onBeforeDestroy`、`onAfterDestroy` | 第一参数 = 目标组件实例 |
| 监视器/副作用 | `watch`、`preWatch`、`postWatch`、`syncWatch`、`effect`、`preEffect`、`postEffect`、`syncEffect` | 第一参数 = 组件实例，或 `null` 表示全局（手动 `stop()`） |
| 上下文 | `setContext`、`setContextGetter`、`getContexts` | 第一参数 = 目标实例；`setContext` 向其上下文层写入值，`setContextGetter` 写入响应式 `getter`，`getContexts` 返回目标实例的上下文链头对象 |

组件文件内这些同名方法都是内建方法（无需导入、已绑定实例；上下文另有 `setContextExp` 简写）。组件文件内导入同名标识符是编译错误——请为导入起别名。

### 响应性优化控制

`batchAndNoTracking`、`batchUpdating`、`noTracking`、`noUpdating`、`pauseTracking`、`pauseUpdating`、`resumeTracking`、`resumeUpdating`、`startBatchUpdating`、`stopBatchUpdating`。

### 状态与调度

| 导出 | 含义 |
|---|---|
| `mountApp` | 挂载应用 |
| `nextTick` | 在更新调度器稳定后 resolve 的 Promise |
| `getCurrentInstance` | 当前实例——只在同步初始化/更新阶段有效；优先改为传递内建 `instance` |
| `createStore` / `createShallowStore` | 响应式状态存储（深/浅），用于跨组件共享 |
| `toReactive` / `toShallow` / `toRaw` | 状态转换 |

### 其他导出

`DESTRUCT_HTML`、`version`。

## 编译器包

用于解析与编译组件源码，供构建工具、语言服务和插件生态调用。

- **方法**：`compile`、`compileIntermediate`、`isCompileError`、`isCompileWarning`、`parseDirectiveValue`、`parseEventFlag`、`parseTemplate`。
- **类型**：`ASTLocation`、`ASTPosition`、`ASTPositionWithFlag`、`CompileIntermediateOptions`、`CompileIntermediateResult`、`CompileOptions`、`CompileResult`、`IdentifierStatus`、`ScriptDescriptor`、`StyleDescriptor`、`TemplateAttribute`、`TemplateNode`、`TemplateNodeContext`、`TextContentPart`。
- **`constants` 对象**：`LSC`、`PRESERVED_IDPREFIX`、`SPREAD_TAG`。
- **`util` 对象**：`camel2Kebab`、`findEndBracket`、`findOutOfComment`、`findOutOfLiteral`、`findOutOfLiteralComment`、`formatSourceCode`、`isEmbeddedLanguageTag`、`isEmbeddedStyleTag`、`isRequiredValueDirective`、`isVoidTag`、`kebab2Camel`、`toPropertyKey`、`ts`。
- **标志**：`PositionFlag`、`TestingMode`。

## 规则

1. 组件文件内绝不导入实例绑定 API；使用内建方法。外部模块中导入并显式绑定。
2. `getCurrentInstance()` 在异步逻辑中不可靠——改为沿调用链传递 `instance` 参数。
3. `EffectHandle`（`stop`/`pause`/`resume`）是所有监视器/副作用注册的返回类型；全局（`null` 绑定）注册必须手动 stop。

## 参见

- [内建标识符](docs://zh-cn/agent/references/intrinsics.md)
- [生命周期](docs://zh-cn/agent/components/lifecycle.md)
- [上下文](docs://zh-cn/agent/components/contexts.md)
- [监视器与副作用](docs://zh-cn/agent/basic/watchers-and-side-effects.md)
- [TypeScript 支持](docs://zh-cn/agent/misc/typescript.md)
