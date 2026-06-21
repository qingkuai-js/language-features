# API Reference

Qingkuai's API is organized by entry package so that imports stay explicit and responsibilities remain clear. This article lists the public APIs exported from the source entry files of two packages: the runtime package `qingkuai` and the compiler package `qingkuai/compiler`.

<div class="custom-block tip">
    The internal package <code>qingkuai/internal</code> is mainly intended for framework internals and is generally not recommended for direct use in application code, so it is not covered here.
</div>

---

## Runtime

The runtime package exports APIs for component lifecycle hooks, reactive side effects, performance controls, and state conversion.

### Type Exports

- `ComponentInstance`
- `HtmlBlockOptions`
- `QingkuaiComponent`

### Lifecycle

- `onAfterDestroy`
- `onAfterMount`
- `onAfterUpdate`
- `onBeforeDestroy`
- `onBeforeUpdate`

See: [Lifecycle](docs://components/lifecycle.md)

### Side Effects and Watchers

- `effect`
- `postEffect`
- `postWatch`
- `preEffect`
- `preWatch`
- `syncEffect`
- `syncWatch`
- `watch`

See: [Watchers and Side Effects](docs://basic/watchers-and-side-effects.md)

### Reactive Optimization Controls

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
- `mountApp`
- `nextTick`
- `toRaw`
- `toReactive`
- `toShallowReactive`

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

The `constants` object contains the following properties:

- `LSC`
- `PRESERVED_IDPREFIX`
- `SPREAD_TAG`

### Utility Object

The `util` object contains the following properties:

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

### Methods

- `compile`
- `compileIntermediate`
- `isCompileError`
- `isCompileWarning`
- `parseDirectiveValue`
- `parseEventFlag`
- `parseTemplate`
