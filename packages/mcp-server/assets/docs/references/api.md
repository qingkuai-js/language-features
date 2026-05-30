---
description: ""
---

# API Reference

Qingkuai's API is organized by entry package so that imports stay explicit and responsibilities remain clear. This article lists the public APIs exported from the source entry files of two packages: the runtime package `qingkuai` and the compiler package `qingkuai/compiler`.

<div class="custom-block tip">
    The internal package <code>qingkuai/internal</code> is mainly intended for framework internals and is generally not recommended for direct use in application code, so it is not covered here.
</div>

---

## Runtime

The runtime package exports APIs for component lifecycle hooks, reactive side effects, performance controls, and state conversion.

### Type Exports

- `HtmlBlockOptions`

### Lifecycle

- `onAfterMount`
- `onBeforeUpdate`
- `onAfterUpdate`
- `onBeforeDestroy`
- `onAfterDestroy`

See: [Lifecycle](docs://components/lifecycle.md)

### Side Effects and Watchers

- `watch`
- `effect`
- `preEffect`
- `postEffect`
- `syncEffect`
- `preWatch`
- `postWatch`
- `syncWatch`

See: [Watchers and Side Effects](docs://basic/watchers-and-side-effects.md)

### Reactive Optimization Controls

- `noTracking`
- `noUpdating`
- `pauseTracking`
- `pauseUpdating`
- `resumeTracking`
- `resumeUpdating`
- `batchUpdating`
- `stopBatchUpdating`
- `startBatchUpdating`
- `batchAndNoTracking`

### State and Scheduling

- `mountApp`
- `nextTick`
- `toRaw`
- `createStore`
- `toReactive`
- `toShallowReactive`

### Other Exports

- `version`
- `DESTRUCT_HTML`

---

## Compiler (`qingkuai/compiler`)

The compiler package is used to parse and compile component source code. It is mainly consumed by build tools, language services, and plugin ecosystems.

### Type Exports

- `ASTLocation`
- `ASTPosition`
- `TemplateNode`
- `CompileOptions`
- `CompileResult`
- `StyleDescriptor`
- `TextContentPart`
- `ScriptDescriptor`
- `IdentifierStatus`
- `TemplateAttribute`
- `ASTPositionWithFlag`
- `TemplateNodeContext`
- `CompileIntermediateOptions`
- `CompileIntermediateResult`

### Constants

- `SPREAD_TAG`
- `PRESERVED_IDPREFIX`
- `LANGUAGE_SERVICE_UTIL`
- `GET_TYPE_DELAY_MARKING`

### Utility Functions

- `camel2Kebab`
- `kebab2Camel`
- `toPropertyKey`
- `findEndBracket`
- `findOutOfComment`
- `findOutOfLiteral`
- `findOutOfLiteralComment`
- `isSelfClosingTag`
- `isEmbeddedLanguageTag`
- `isRequiredValueDirective`

### Methods and Flags

- `PositionFlag`
- `isCompileError`
- `isCompileWarning`
- `parseDirectiveValue`
- `parseEventFlag`
- `parseTemplate`
- `compile`
- `compileIntermediate`
