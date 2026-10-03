---
description: "Qingkuai agent entry: syntax cheat sheet, code-generation rules, task-to-doc routing, and cross-syntax dependency lookup to assist editing and generation of .qk files."
keywords: ["qingkuai", ".qk", "syntax", "指令", "引用属性", "组件", "响应性", "cheat sheet"]
---

# Qingkuai Agent Reference Index

## Syntax Cheat Sheet

### Compilation directives

| Token | Meaning |
| --- | --- |
| `#if={cond}` | Render the element only when `cond` is truthy. |
| `#elif={cond}` | Else-if branch chained after `#if`. |
| `#else` | Fallback branch of an `#if`/`#elif` chain. |
| `#for={item, index of source}` | List rendering over a number, array, object, string, `Set`, or `Map`; iteration uses `of` (never `in`); item/index names support destructuring. |
| `#key={expr}` | Unique identity for `#for`-rendered nodes; add it when list items hold local state; keys must be unique within the list. |
| `#await={promise}` | Render placeholder content until a `Promise` settles. |
| `#then={res}` | Render on resolve; the value is an identifier (or destructuring) bound to the resolved value. |
| `#catch={err}` | Render on reject; the value is an identifier (or destructuring) bound to the rejection reason. |
| `#html` / `#html={conf}` | Insert the single text child as HTML instead of escaped text; optional config `{ escapeTags, escapeStyle, escapeScript }` keeps untrusted tags escaped. |
| `#target={sel}` / `#target={el}` | Mount the node into a parent given as a CSS selector string or an `HTMLElement`. |
| `#scope` | Component tags only: pass the parent's scope attribute to the child's root element for style override; composable along the ancestor chain. |
| `#slot={"name"}` | Receive slot context when passing content into a component; the value names the target slot. |

Directive priority (high to low): `slot` > `await/then/catch` > `if/elif/else` > `target` > `for/key` > `html`; unlisted directives process after `html` in tag appearance order.

### Reference attributes

| Token | Meaning |
| --- | --- |
| `&value={var}` | Two-way bind an input's value to `var` (reference passing; under the hood a setter invocation). |
| `&number={var}` | Like `&value` but coerces the bound value to a number. |
| `&checked={var}` | Two-way bind the checked state of a checkbox or radio input. |
| `&group={var}` | Two-way bind a group of checkboxes (bound value is an array). |
| `&handle={var}` | Bind the element's DOM node to `var`; the variable is reset to `null` when the element is destroyed. |

Reference-attribute values must be assignable lvalues: identifiers, `arr[index]`, `obj.property` are valid; function calls, optional chains (`?.`), and ternaries are not. When the attribute name matches the variable name, `{var}` can be omitted (e.g. `&handle` equals `&handle={handle}`), except for keywords/reserved words of the embedded scripting language.

### Built-in elements

| Token | Meaning |
| --- | --- |
| `qk:spread` | Virtual mounting point for directives applied to multiple sibling nodes or a text node; it is not rendered as an actual HTML element. |

### Intrinsic identifiers

| Token | Meaning |
| --- | --- |
| `props` | Read normal attributes and event attributes passed into the component from outside. |
| `refs` | Access reference attributes inside a component and perform writable updates (two-way binding). |
| `slots` | Determine whether slot content has been passed into the component. |
| `contexts` | Read context data; reads walk the prototype chain to the nearest ancestor value, own-layer keys shadow inherited ones. |
| `instance` | The component's own instance; the binding argument for instance-bound runtime APIs (`setContext`, `watch`, ...). |
| `reactive` | Explicitly mark an identifier deep-reactive (`let`/`var`: itself plus nested; `const`: properties recursively). |
| `shallow` | Explicitly mark an identifier shallow-reactive (`let`/`var`: itself only; `const`: first-level properties only). |
| `raw` | Explicitly mark an identifier static; modifications do not trigger page updates. |
| `alias` | Create an alias for an identifier, simplifying complex read/write expressions while preserving reactivity. |
| `derived` | Create derived reactive state that tracks its dependencies automatically. |
| `derivedExp` | Shorthand: the compiler converts the expression into a standard `derived` declaration. |
| `watch` | Register a watcher; callback receives previous and current values; no import needed, auto-cleaned on destroy. |
| `preWatch` | Register a pre-watcher that runs before the update scheduler and before template updates. |
| `postWatch` | Register a post-watcher that runs after scheduled updates complete. |
| `syncWatch` | Register a synchronous watcher that runs immediately after a dependent value changes, before the scheduler. |
| `watchExp` | Shorthand: an expression converted into a standard `watch` registration. |
| `preWatchExp` | Shorthand registration for a pre-watcher from an expression. |
| `postWatchExp` | Shorthand registration for a post-watcher from an expression. |
| `syncWatchExp` | Shorthand registration for a synchronous watcher from an expression. |
| `effect` | Register a reactive side effect; dependencies are auto-collected; no import, auto-cleaned on destroy. |
| `preEffect` | Pre-effect: runs before the update scheduler and before template updates. |
| `postEffect` | Post-effect: runs after scheduled updates complete. |
| `syncEffect` | Synchronous effect: runs immediately after a dependent value changes, before the scheduler. |
| `defaults` | Define defaults for optional attributes via an object with `props`, `refs`, and `contexts` keys. |
| `setContext` | Write data into the current component's contexts layer for itself and all descendants. |
| `setContextGetter` | Write a getter into the contexts layer; auto-invoked on descendant reads for reactive context passing. |
| `setContextExp` | Shorthand: an expression wrapped as a getter and converted into a `setContextGetter` call. |

## Code Generation Rules

1. Two-way form binding uses reference attributes (`&value`), not `!value` plus `@input={...}`.
2. Obtain DOM elements with `&handle` on the element instead of manual DOM queries; the bound variable resets to `null` on element destruction.
3. Prefer compiler-inferred reactivity; add `reactive`, `shallow`, or `raw` only when explicit marking is required.
4. When the user cares about runtime performance, combine `"reactivityMode": "shallow"` with `"allowConstReactive": false` in `.qingkuairc` to enter Signal Mode (see [optimization.md](docs://agent/misc/optimization.md)); in this mode updates are triggered only by reassigning the identifier itself.
5. Derived state uses `derived`; prefer `derivedExp` or the `$` prefix shorthand when a plain expression suffices.
6. Use `qk:spread` as a virtual directive mount point instead of introducing meaningless wrapper elements.
7. Add `#key` to `#for`-rendered elements that carry local state; keys must be unique within the same list.
8. Reference-attribute values must be assignable lvalues: no function calls, optional chains, or ternaries.
9. Watcher/effect calls (`watch`, `effect`, and their variants) need no import; the compiler binds them to the component instance and cleans them up on destroy.
10. Use plain interpolation for text; use `#html` only when raw HTML insertion is intended, and keep exactly one text child inside it.
11. Never invent syntax or identifiers; verify every token against the docs in "Task To Docs" before writing it.

## Task To Docs

| Task | Doc |
| --- | --- |
| Conditional rendering, list rendering, async rendering, `#html`/`#target`/`#scope` | [compilation-directives.md](docs://agent/basic/compilation-directives.md) |
| Declaring and using reactive state | [reactivity.md](docs://agent/basic/reactivity.md) |
| Whether an identifier is inferred raw, reactive, or shallow | [reactivity-infer-rules.md](docs://agent/references/reactivity-infer-rules.md) |
| Form input processing and binding | [forms.md](docs://agent/basic/forms.md) |
| Reference attributes (`&value`, `&number`, `&checked`, `&group`, `&handle`) | [reference-attributes.md](docs://agent/basic/reference-attributes.md), [forms.md](docs://agent/basic/forms.md) |
| Passing attributes and events into components (`props`, `defaults`) | [attributes.md](docs://agent/components/attributes.md) |
| Event listeners (`@click` and event attributes) | [event-handling.md](docs://agent/basic/event-handling.md) |
| Slot content and slot context (`#slot`, `slots`) | [slots.md](docs://agent/components/slots.md) |
| Component lifecycle callbacks (`onAfterMount`, ...) | [lifecycle.md](docs://agent/components/lifecycle.md) |
| Cross-component context sharing (`contexts`, `setContext`) | [contexts.md](docs://agent/components/contexts.md) |
| Component scoped styles and embedded style blocks | [stylesheets.md](docs://agent/components/stylesheets.md) |
| Async component loading | [async-components.md](docs://agent/components/async-components.md) |
| Dynamic component switching | [dynamic-components.md](docs://agent/components/dynamic-components.md) |
| Component exports | [exports.md](docs://agent/components/exports.md) |
| Component file structure and basics | [basic.md](docs://agent/components/basic.md) |
| Text interpolation `{expr}` | [interpolation.md](docs://agent/basic/interpolation.md) |
| Watchers and side effects (`watch`/`effect` families) | [watchers-and-side-effects.md](docs://agent/basic/watchers-and-side-effects.md) |
| All built-in identifiers | [intrinsics.md](docs://agent/references/intrinsics.md) |
| Runtime package API | [api.md](docs://agent/references/api.md) |
| Terminology (embedded blocks, runtime package) | [terminology.md](docs://agent/references/terminology.md) |
| Compiler/runtime error codes | [error-code.md](docs://agent/references/error-code.md) |
| TypeScript support and component instance types | [typescript.md](docs://agent/misc/typescript.md) |
| Config files | [config-files.md](docs://agent/misc/config-files.md) |
| Debugging | [debugging.md](docs://agent/misc/debugging.md) |
| Optimization | [optimization.md](docs://agent/misc/optimization.md) |
| Built-in elements (`qk:spread`) | [builtin-elements.md](docs://agent/misc/builtin-elements.md) |
| Language features overview | [language-features.md](docs://agent/misc/language-features.md) |
| Installation | [install.md](docs://agent/getting-started/install.md) |
| Command line tool (init / type checking / formatting / build) | [cli.md](docs://agent/misc/cli.md) |
| Framework overview and design philosophy | [introduction.md](docs://agent/getting-started/introduction.md) |

## Syntax Dependency Route

- `qk:spread` appears → read [builtin-elements.md](docs://agent/misc/builtin-elements.md)
- `#slot` appears → read [compilation-directives.md](docs://agent/basic/compilation-directives.md) and [slots.md](docs://agent/components/slots.md)
- `props`/`refs`/`slots` intrinsic identifiers appear → read [intrinsics.md](docs://agent/references/intrinsics.md)
- reactivity ambiguity (raw vs reactive vs shallow) → read [reactivity-infer-rules.md](docs://agent/references/reactivity-infer-rules.md)
- async directives with component loading → read [compilation-directives.md](docs://agent/basic/compilation-directives.md) and [async-components.md](docs://agent/components/async-components.md)

## Multi-Doc Priority Rules

- Editing markup + state together: [compilation-directives.md](docs://agent/basic/compilation-directives.md) → [reactivity.md](docs://agent/basic/reactivity.md) → [reactivity-infer-rules.md](docs://agent/references/reactivity-infer-rules.md)
- Component boundary APIs: [attributes.md](docs://agent/components/attributes.md) → [intrinsics.md](docs://agent/references/intrinsics.md) → [slots.md](docs://agent/components/slots.md)
