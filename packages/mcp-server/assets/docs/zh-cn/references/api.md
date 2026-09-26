# API 参考

Qingkuai 的 API 按入口包划分，便于按需引入并保持清晰的职责边界。本文基于源码入口文件整理两类公开 API：运行时包 `qingkuai` 与编译器包 `qingkuai/compiler` 。

> [!TIP]
> 内部包 `qingkuai/internal` 主要面向框架内部实现，通常不建议业务代码直接依赖，因此本节不展开说明。

---

## 运行时包

运行时包导出组件生命周期、上下文、响应式副作用、性能优化及状态转换等 API。

### 类型导出

- `BoundEffectFunc`
- `BoundLifecycleFunc`
- `BoundSetContextFunc`
- `BoundSetContextGetterFunc`
- `BoundWatchFunc`
- `ComponentContexts`
- `ComponentExports`
- `ComponentInstance`
- `ComponentProps`
- `ComponentRefs`
- `ComponentShape`
- `ComponentSlots`
- `DeclareComponent`
- `EffectCallback`
- `EffectHandle`
- `HtmlBlockOptions`
- `WatchCallback`

参考：[工具类型](docs://zh-cn/misc/typescript.md#工具类型)

### 生命周期

- `onAfterDestroy`{builtin}
- `onAfterMount`{builtin}
- `onAfterUpdate`{builtin}
- `onBeforeDestroy`{builtin}
- `onBeforeUpdate`{builtin}

参考：[生命周期](docs://zh-cn/components/lifecycle.md)。注意：在组件文件内部，这些方法是[内建方法](docs://zh-cn/references/terminology.md#内建方法)，无需导入即可直接调用；从运行时包导入使用时，第一个参数需要显式传入目标组件实例。

### 副作用与监视器

- `effect`{builtin}
- `postEffect`{builtin}
- `postWatch`{builtin}
- `preEffect`{builtin}
- `preWatch`{builtin}
- `syncEffect`{builtin}
- `syncWatch`{builtin}
- `watch`{builtin}

参考：[监视器与副作用](docs://zh-cn/basic/watchers-and-side-effects.md)。与生命周期方法一样，从运行时包导入使用时，第一个参数为组件实例或 `null`。

### 上下文

- `getContexts`
- `setContext`{builtin}
- `setContextGetter`{builtin}

用于在外部逻辑中操作指定组件实例的上下文：`setContext` 向目标实例的上下文层写入值，`setContextGetter` 写入响应式 `getter`，`getContexts` 返回目标实例的上下文链头对象。在组件文件内部，请直接使用[内建方法](docs://zh-cn/references/terminology.md#内建方法) `setContext`、`setContextExp`、`setContextGetter` 与[内建标识符](docs://zh-cn/references/terminology.md#内建标识符) `contexts`。

参考：[上下文](docs://zh-cn/components/contexts.md)

### 响应性优化控制

- `batchAndNoTracking`
- `batchUpdating`
- `noTracking`
- `noUpdating`
- `pauseTracking`
- `pauseUpdating`
- `resumeTracking`
- `resumeUpdating`
- `startBatchUpdating`
- `stopBatchUpdating`

### 状态与调度

- `createShallowStore`
- `createStore`
- `getCurrentInstance`
- `mountApp`
- `nextTick`
- `toRaw`
- `toReactive`
- `toShallow`

### 其他导出

- `DESTRUCT_HTML`
- `version`

---

## 编译器包

编译器包用于解析与编译组件源码，主要被构建工具、语言服务和插件生态调用。

### 类型导出

- `ASTLocation`
- `ASTPosition`
- `ASTPositionWithFlag`
- `CompileIntermediateOptions`
- `CompileIntermediateResult`
- `CompileOptions`
- `CompileResult`
- `IdentifierStatus`
- `ScriptDescriptor`
- `StyleDescriptor`
- `TemplateAttribute`
- `TemplateNode`
- `TemplateNodeContext`
- `TextContentPart`

### 常量对象

编译器包导出的 `constants` 对象包含以下属性：

- `LSC`
- `PRESERVED_IDPREFIX`
- `SPREAD_TAG`

### 工具对象

编译器包导出的 `util` 对象包含以下属性：

- `camel2Kebab`
- `findEndBracket`
- `findOutOfComment`
- `findOutOfLiteral`
- `findOutOfLiteralComment`
- `formatSourceCode`
- `isEmbeddedLanguageTag`
- `isEmbeddedStyleTag`
- `isRequiredValueDirective`
- `isVoidTag`
- `kebab2Camel`
- `toPropertyKey`
- `ts`

### 标志

- `PositionFlag`
- `TestingMode`

### 方法

- `compile`
- `compileIntermediate`
- `isCompileError`
- `isCompileWarning`
- `parseDirectiveValue`
- `parseEventFlag`
- `parseTemplate`
