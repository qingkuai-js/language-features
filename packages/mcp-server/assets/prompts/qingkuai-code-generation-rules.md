Follow this protocol when generating or modifying `.qk` code.

---

## Non-Negotiable Rules

1. For installation/initialization/scaffolding tasks, stop using this prompt and switch to `qingkuai-install-init-create-qingkuai-first`.
2. For installation/initialization/scaffolding tasks, call `get_qingkuai_project_bootstrap_guide` first, then `search_qingkuai_docs`.
3. For syntax/API/rules, use MCP docs first (`search_qingkuai_docs` + `docs://...`).
4. Use website https://qingkuai.dev only as fallback when MCP docs are missing or insufficient.
5. Never invent syntax.

---

## Mandatory Execution Order

1. Query docs needed for this task (MCP docs first).
2. Generate `.qk` code.
3. Enforce binding rules (rewrite forbidden two-way simulation patterns).
4. Format with `format_qingkuai_code`.
5. Validate with `check_qingkuai_syntax`.
6. If problems remain, inspect with `compile_qingkuai`, fix, then validate again.

If any step fails, do not finalize output until fixed.

---

## Final Output Gates (Fail-Closed)

All conditions must be true before final output:

1. Two-way binding uses reference attributes (`&...`) whenever equivalent.
2. No `!attr + @event/@update` two-way simulation remains when equivalent `&attr` exists.
3. Syntax/API/rules decisions are based on MCP docs first; website is fallback only.

Internal pass statements:

- "Reference-attribute gate passed."
- "MCP-doc-first gate passed."

---

## Rule A: Reference Attributes First (Highest Priority)

Reference docs:

- docs://basic/reference-attributes.md
- docs://basic/forms.md

Requirements:

- Use `&attr` for two-way binding.
- Do not use `!attr + @event` or `!attr + @update` to simulate two-way binding when `&attr` is equivalent.

Common rewrites:

- `!value + @input` -> `&value` / `&number`
- `!checked + @change` -> `&checked`
- `!modelValue + @update` -> `&modelValue` (for components)
- `!attr={x} @update={v => x = v}` -> `&attr={x}` (for components)

Exception:

- Keep `!attr + @event` only when behavior is not two-way sync (for example side-effects or analytics), and briefly justify why `&attr` is not equivalent.

---

## Rule B: Prefer `&dom`

Reference doc:

- docs://basic/reference-attributes.md

Use `&dom={variable}` instead of `document.querySelector` / `getElementById`.

---

## Rule C: Minimize Explicit Reactivity

Reference docs:

- docs://basic/reactivity.md
- docs://references/reactivity-infer-rules.md

Prefer compiler inference. Only use explicit controls when needed:

- `reactive(v)` for deep reactivity
- `shallow(v)` for top-level tracking only
- `raw(v)` to opt out

For derived state:

- Use `$` shorthand only when `.qingkuairc` enables `shorthandDerivedDeclaration` and project style already uses it.
- Use `derivedExp(expr)` for short expressions.
- Use `derived(() => ...)` for complex logic.

---

## Rule D: Follow Project Naming Config

Reference docs:

- docs://components/basic.md
- docs://components/attributes.md
- docs://misc/config-files.md

Follow `.prettierrc` settings:

- `componentTagFormatPreference`
- `componentAttributeFormatPreference`

If config is unavailable, default to camelCase and keep style consistent within the same project.
