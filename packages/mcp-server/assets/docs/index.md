---
description: "Primary MCP entry for Qingkuai docs: retrieval route, task-to-doc mapping, and cross-syntax dependency lookup for .qk editing."
---

# Topic

Primary entry document for agent retrieval when user asks to modify `.qk` files or mentions Qingkuai syntax.

# Retrieval Route

1. Parse task intent from user request.
2. Open one or more target docs from `Task To Docs`.
3. If request includes unfamiliar syntax token, resolve from `Syntax Dependency Route`.
4. If multiple docs conflict, prioritize `references/*` > `basic/*` > `components/*` > `misc/*` > `getting-started/*`.

# Task To Docs

- Template interpolation or dynamic attrs:
    - `docs://basic/interpolation.md`
- Events and flags:
    - `docs://basic/event-handling.md`
- Directives (`#if/#for/#await/#html/#target/#slot`):
    - `docs://basic/compilation-directives.md`
- Reactivity and derived state:
    - `docs://basic/reactivity.md`
    - `docs://references/reactivity-infer-rules.md`
- Form binding (`&value/&number/&checked/&group`):
    - `docs://basic/forms.md`
    - `docs://basic/reference-attributes.md`
- Watch/effect scheduling behavior:
    - `docs://basic/watchers-and-side-effects.md`
- Component usage and attrs:
    - `docs://components/basic.md`
    - `docs://components/attributes.md`
- Slots and slot context:
    - `docs://components/slots.md`
- Async component patterns:
    - `docs://components/async-components.md`
- Lifecycle hooks:
    - `docs://components/lifecycle.md`
- Stylesheet scoping:
    - `docs://components/stylesheets.md`
- Built-in elements (`qk:spread`):
    - `docs://misc/builtin-elements.md`
- Intrinsic identifiers (`props/refs/slots/...`):
    - `docs://references/intrinsics.md`
- Type inference / generics / TS ergonomics:
    - `docs://misc/typescript.md`
- Config-related behavior:
    - `docs://misc/config-files.md`

# Syntax Dependency Route

- `qk:spread` appears:
    - always read `docs://misc/builtin-elements.md`
- `#slot` appears:
    - read `docs://basic/compilation-directives.md` and `docs://components/slots.md`
- `props` / `refs` / `slots` intrinsic identifiers appear:
    - read `docs://references/intrinsics.md`
- reactivity ambiguity (raw vs reactive vs shallow):
    - read `docs://references/reactivity-infer-rules.md`
- async directives with component loading:
    - read `docs://basic/compilation-directives.md` and `docs://components/async-components.md`

# Multi-Doc Priority Rules

- When editing markup + state together, read in order:
    1. `docs://basic/compilation-directives.md`
    2. `docs://basic/reactivity.md`
    3. `docs://references/reactivity-infer-rules.md`
- When editing component boundary APIs, read in order:
    1. `docs://components/attributes.md`
    2. `docs://references/intrinsics.md`
    3. `docs://components/slots.md`
- When optimizing load strategy, include:
    - `docs://components/async-components.md`
    - `docs://misc/config-files.md`

# Examples

```text
User request: "把这个 .qk 的列表改成异步组件并加 loading"
Route:
1) docs://components/async-components.md
2) docs://basic/compilation-directives.md
3) docs://misc/builtin-elements.md (if qk:spread used)
```

```text
User request: "这个 props 解构后为什么不更新？"
Route:
1) docs://components/attributes.md
2) docs://references/intrinsics.md
3) docs://basic/reactivity.md
```
