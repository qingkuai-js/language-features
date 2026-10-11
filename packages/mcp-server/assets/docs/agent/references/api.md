---
description: "Qingkuai runtime and compiler package API reference: instance-bound runtime APIs, contexts operations, reactivity controls, state/scheduling functions, and compiler entry exports."
keywords: ["api", "runtime package", "qingkuai", "compiler", "mountApp", "nextTick", "runtime"]
---

# API Reference

APIs are organized by entry package, making on-demand imports easy and keeping responsibility boundaries clear: the runtime package `qingkuai` and the compiler package `qingkuai/compiler`. The internal `qingkuai/internal` package is intended for framework internals; application code is generally not recommended to depend on it directly.

## Runtime Package

### Type exports

`BoundEffectFunc`, `BoundLifecycleFunc`, `BoundSetContextFunc`, `BoundSetContextGetterFunc`, `BoundWatchFunc`, `ComponentContexts`, `ComponentExports`, `ComponentInstance`, `ComponentProps`, `ComponentRefs`, `ComponentShape`, `ComponentSlots`, `DeclareComponent`, `EffectCallback`, `EffectHandle`, `HtmlBlockOptions`, `WatchCallback` — see TypeScript Support for usage.

### Instance-bound APIs

| Group | Exports | External-call rule |
|---|---|---|
| Lifecycle | `onAfterMount`, `onBeforeUpdate`, `onAfterUpdate`, `onBeforeDestroy`, `onAfterDestroy` | First argument = target component instance |
| Watchers / effects | `watch`, `preWatch`, `postWatch`, `syncWatch`, `effect`, `preEffect`, `postEffect`, `syncEffect` | First argument = component instance, or `null` for global (manual `stop()`) |
| Contexts | `setContext`, `setContextGetter`, `getContexts` | First argument = target instance; `setContext` writes a value into its contexts layer, `setContextGetter` writes a reactive getter, `getContexts` returns the contexts chain-head object of the target instance |

Inside component files these same names are built-in methods (no import, already instance-bound; contexts also has the `setContextExp` shorthand). Importing an identifier with the same name inside a component file is a compile error — alias the import.

### Reactivity optimization controls

`batchAndNoTracking`, `batchUpdating`, `noTracking`, `noUpdating`, `pauseTracking`, `pauseUpdating`, `resumeTracking`, `resumeUpdating`, `startBatchUpdating`, `stopBatchUpdating`.

### State and scheduling

| Export | Meaning |
|---|---|
| `mountApp` | Mount the application |
| `nextTick` | Promise resolving after the update scheduler settles |
| `getCurrentInstance` | Current instance — valid ONLY during synchronous init/update phase; prefer passing the built-in `instance` instead |
| `createStore` / `createShallowStore` | Reactive state store (deep / shallow) for cross-component sharing |
| `toReactive` / `toShallow` / `toRaw` | State conversion |

### Other exports

`DESTRUCT_HTML`, `version`.

## Compiler Package

Used to parse and compile component source code; consumed by build tools, language services, and plugin ecosystems.

- **Methods**: `compile`, `compileIntermediate`, `isCompileError`, `isCompileWarning`, `parseDirectiveValue`, `parseEventFlag`, `parseTemplate`.
- **Types**: `ASTLocation`, `ASTPosition`, `ASTPositionWithFlag`, `CompileIntermediateOptions`, `CompileIntermediateResult`, `CompileOptions`, `CompileResult`, `IdentifierStatus`, `ScriptDescriptor`, `StyleDescriptor`, `TemplateAttribute`, `TemplateNode`, `TemplateNodeContext`, `TextContentPart`.
- **`constants` object**: `LSC`, `PRESERVED_IDPREFIX`, `SPREAD_TAG`.
- **`util` object**: `camel2Kebab`, `findEndBracket`, `findOutOfComment`, `findOutOfLiteral`, `findOutOfLiteralComment`, `formatSourceCode`, `isEmbeddedLanguageTag`, `isEmbeddedStyleTag`, `isRequiredValueDirective`, `isVoidTag`, `kebab2Camel`, `toPropertyKey`, `ts`.
- **Flags**: `PositionFlag`, `TestingMode`.

## Rules

1. Never import instance-bound APIs inside a component file; use the built-ins. In external modules, import and bind explicitly.
2. `getCurrentInstance()` is unreliable in async logic — pass `instance` as a parameter through the call chain instead.
3. `EffectHandle` (`stop`/`pause`/`resume`) is the return type of all watcher/effect registrations; global (`null`-bound) registrations MUST be stopped manually.

## See also

- [Built-in Identifiers](docs://agent/references/intrinsics.md)
- [Lifecycle](docs://agent/components/lifecycle.md)
- [Contexts](docs://agent/components/contexts.md)
- [Watchers and Side Effects](docs://agent/basic/watchers-and-side-effects.md)
- [TypeScript Support](docs://agent/misc/typescript.md)
