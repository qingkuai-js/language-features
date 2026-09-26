---
description: "Complete reference of Qingkuai built-in identifiers: props, refs, slots, contexts, instance, reactivity markers, watcher/effect families, defaults, and context methods."
keywords: ["built-in identifiers", "props", "refs", "slots", "contexts", "instance", "reactive", "watch", "effect", "标识符"]
---

# Built-in Identifiers

Built-in identifiers are reserved names inside component files that require no declaration and are recognized and handled directly by the compiler. They are mainly used to access component attributes, reference attributes, slot state, and contexts, as well as to call built-in methods provided by the compiler.

## Data access identifiers

| Identifier | Meaning |
|---|---|
| `props` | Read normal attributes and event attributes passed into the component; properties are read-only getters |
| `refs` | Access reference attributes; writable — writes sync back to the parent's data (two-way binding) |
| `slots` | Determine whether slot content was passed in; adjust rendering by slot presence |
| `contexts` | Read context data; reads walk the prototype chain to find the nearest value; own-layer keys shadow inherited keys without affecting the parent's value |
| `instance` | The component's own instance; the binding argument for instance-bound runtime APIs (`setContext`, `watch`, ...) in external modules |

## Reactivity markers and state

| Identifier | Meaning |
|---|---|
| `reactive` | Mark an identifier deeply reactive (`let`/`var`: itself plus nested; `const`: properties recursively) |
| `shallow` | Mark an identifier shallow-reactive (`let`/`var`: itself only; `const`: first-level properties only) |
| `raw` | Mark an identifier static; modifications do not trigger page updates; pass an expression to `raw` for a non-reactive read (dependency tracking is paused during evaluation, and reads are not counted as accesses in the template) |
| `alias` | Create a reactive alias for an identifier; simplifies complex read/write expressions while preserving reactivity; also the way to destructure `props`/`refs` reactively |
| `derived` | Create derived reactive state that tracks its dependencies automatically |
| `derivedExp` | Expression form: an expression the compiler converts into a standard `derived` declaration |

## Watchers

| Identifier | Meaning |
|---|---|
| `watch` | Register a watcher; callback receives `(pre, cur)`; normal timing (order vs. scheduler not guaranteed) |
| `preWatch` | Runs before the update scheduler and before template updates |
| `postWatch` | Runs after scheduled updates complete |
| `syncWatch` | Runs synchronously right after a dependent value changes, before the scheduler |
| `watchExp` / `preWatchExp` / `postWatchExp` / `syncWatchExp` | Shorthands: pass an expression directly; the compiler wraps it into a getter |

## Side effects

| Identifier | Meaning |
|---|---|
| `effect` | Register a reactive side effect; reactive values read in the callback are auto-collected dependencies |
| `preEffect` | Pre-effect: before the scheduler and template updates |
| `postEffect` | Post-effect: after scheduled updates complete |
| `syncEffect` | Synchronous effect: immediately after the dependent value changes |

## Attribute defaults and contexts

| Identifier | Meaning |
|---|---|
| `defaults` | Define defaults for optional attributes via `{ props: {...}, refs: {...}, contexts: {...} }`; defaulted keys narrow to non-optional |
| `setContext` | Write data into the current component's contexts layer (value snapshot at write time); own-layer keys shadow inherited keys without affecting the parent's value, and descendants read them via `contexts` |
| `setContextGetter` | Write a getter into the contexts layer; auto-invoked on descendant reads for reactive contexts |
| `setContextExp` | Shorthand: expression wrapped as a getter → `setContextGetter` |

## Rules

1. All watcher/effect/context methods above are built-in inside component files: no import, bound to the current instance, auto-cleaned on destroy.
2. Markers (`reactive`/`shallow`/`raw`) are only valid in variable-declaration initializers.
3. Importing a same-named identifier inside a component file is a compile error — alias runtime-package imports instead.
4. Outside component files, import these APIs from the `qingkuai` runtime package and pass the component instance (or `null` for global watchers/effects) as the first argument.

## See also

- [Reactivity](docs://agent/basic/reactivity.md)
- [Watchers and Side Effects](docs://agent/basic/watchers-and-side-effects.md)
- [Component Contexts](docs://agent/components/contexts.md)
- [Runtime Package API](docs://agent/references/api.md)
