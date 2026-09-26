# API Reference

Qingkuai's API is organized by entry package, making on-demand imports easy and keeping responsibility boundaries clear. This article lists the public APIs exported from the source entry files of two packages: the runtime package `qingkuai` and the compiler package `qingkuai/compiler`.

> [!TIP]
> The internal package `qingkuai/internal` is mainly intended for framework internals, and application code is generally not recommended to depend on it directly, so it is not covered here.

---

## Runtime

The runtime package exports APIs for component lifecycle methods, contexts, reactive side effects, performance optimization, and state conversion.

### Type Exports

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

See: [Utility Types](docs://misc/typescript.md#utility-types)

### Lifecycle

- `onAfterDestroy`{builtin}
- `onAfterMount`{builtin}
- `onAfterUpdate`{builtin}
- `onBeforeDestroy`{builtin}
- `onBeforeUpdate`{builtin}

See: [Lifecycle](docs://components/lifecycle.md). Note that inside component files these methods are [built-in methods](docs://references/terminology.md#built-in-methods) and can be called directly without importing. When importing them from the runtime package, the target component instance must be explicitly passed as the first argument.

### Side Effects and Watchers

- `effect`{builtin}
- `postEffect`{builtin}
- `postWatch`{builtin}
- `preEffect`{builtin}
- `preWatch`{builtin}
- `syncEffect`{builtin}
- `syncWatch`{builtin}
- `watch`{builtin}

See: [Watchers and Side Effects](docs://basic/watchers-and-side-effects.md). Like the lifecycle methods, when importing them from the runtime package, the first argument is the component instance or `null`.

### Contexts

- `getContexts`
- `setContext`{builtin}
- `setContextGetter`{builtin}

Used to operate on the contexts of a specific component instance in external logic: `setContext` writes a value into the target instance's contexts layer, `setContextGetter` writes a reactive getter, and `getContexts` returns the contexts chain-head object of the target instance. Inside component files, use the [built-in methods](docs://references/terminology.md#built-in-methods) `setContext`, `setContextExp`, and `setContextGetter` together with the [built-in identifier](docs://references/terminology.md#built-in-identifiers) `contexts` instead.

See: [Contexts](docs://components/contexts.md)

### Reactivity Optimization Controls

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

### State and Scheduling

- `createShallowStore`
- `createStore`
- `getCurrentInstance`
- `mountApp`
- `nextTick`
- `toRaw`
- `toReactive`
- `toShallow`

### Other Exports

- `DESTRUCT_HTML`
- `version`

---

## Compiler (`qingkuai/compiler`)

The compiler package is used to parse and compile component source code. It is mainly consumed by build tools, language services, and plugin ecosystems.

### Type Exports

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

### Constants Object

The `constants` object exported by the compiler package contains the following properties:

- `LSC`
- `PRESERVED_IDPREFIX`
- `SPREAD_TAG`

### Utility Object

The `util` object exported by the compiler package contains the following properties:

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

### Flags

- `PositionFlag`
- `TestingMode`

### Methods

- `compile`
- `compileIntermediate`
- `isCompileError`
- `isCompileWarning`
- `parseDirectiveValue`
- `parseEventFlag`
- `parseTemplate`
