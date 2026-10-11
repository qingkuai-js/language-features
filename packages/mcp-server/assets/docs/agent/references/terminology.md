---
description: "Qingkuai terminology reference: component file/instance, attribute kinds, interpolation terms, embedded language tags, slot terms, runtime package, built-in identifiers and methods."
keywords: ["terminology", "glossary", "component file", "runtime package", "built-in methods", "术语"]
---

# Terminology Reference

Canonical terms used across the documentation; use these names consistently when reasoning or writing about `.qk` code.

## Files and instances

| Term | Meaning |
|---|---|
| Component file | A `.qk` file; each file is one component declaration |
| Component instance | Runtime object created after compilation; carries exported members and internal state. Obtained via `&handle` (parent side) or the built-in `instance` (inside); the binding argument for instance-bound runtime APIs |
| Runtime package | npm package with entry `qingkuai`: lifecycles, contexts, watchers/effects, performance optimization, state conversion. Inside component files most APIs are built-in methods; outside, import them with an instance as first binding argument |
| Compiler package | npm package with entry `qingkuai/compiler`; parses/compiles `.qk` source; consumed by build tools, language services, and the plugin ecosystem |
| Built-in identifiers | Reserved, undeclared, compiler-recognized identifiers: object-like (`props`, `refs`, `slots`, `contexts`, `instance`) and method-like (built-in methods) |
| Built-in methods | Method identifiers usable directly in component files (reactivity marking, defaults, context writing, watchers/effects, lifecycles); compile-time markers transformed into instance-bound calls |

## Attributes and interpolation

| Term | Meaning |
|---|---|
| Static attribute | Value is a plain string literal (quoted) |
| Dynamic attribute | `!` prefix; value computed from an interpolation expression; binds non-plain-string data such as booleans and objects |
| Reference attribute | `&` prefix; writable channel for value synchronization / reference passing; on component tags and native tags like `input`/`textarea`/`select`; accessed and updated inside via `refs` |
| Event | `@` prefix attribute binding interaction logic or exposing callbacks |
| Interpolated attribute | Collective term for directives, dynamic attributes, reference attributes, and events |
| Interpolation block | Any `{expr}` embedded JS/TS expression in template text or attribute values |
| Embedded script block | `lang-js` / `lang-ts` tag region processed by the compiler |
| Embedded style block | `lang-css`/`lang-scss`/`lang-sass`/`lang-less`/`lang-stylus`/`lang-postcss` region; supports `src` and `global` attributes |
| Embedded language tags | The eight `lang-*` tags above |
| Scope | The range in template/script where identifiers are accessible; affects visibility in slot and directive contexts |
| `qk:spread` | Built-in element; virtual directive mounting point, not rendered as a real DOM element |

## Slots and reactivity

| Term | Meaning |
|---|---|
| Slot outlet | Placeholder declared with the `slot` tag inside a component |
| Slot content | Child content passed by the consumer; rendered at the matching outlet |
| Reactive / reactivity / reactive value | Capability of tracking value changes and triggering dependency updates / the abstract capability itself / a concrete unit of data with that capability |
| Watcher | Listens for reactive-value changes and runs a callback with `(pre, cur)` |
| Side effect | Logic depending on reactive state that reruns after the state changes |
| Global watcher / global side effect | Created by passing `null` as the binding argument to a runtime-package API; not auto-cleaned; manual lifecycle via the returned handle |

## See also

- [Built-in Identifiers](docs://agent/references/intrinsics.md)
- [Runtime Package API](docs://agent/references/api.md)
- [Component Basics](docs://agent/components/basic.md)
