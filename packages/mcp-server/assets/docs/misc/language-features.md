---
description: "IDE and language service features for Qingkuai - extensions, Emmet, formatting, navigation."
---

# Language Features

Qingkuai provides rich language features through LSP-based language service. Features include type inference, completion, diagnostics, code navigation, and semantic highlighting.

---

## IDE Extensions

### VS Code Extension

**Availability:** Available for VS Code

**Installation:** Search for `Qingkuai` in marketplace to install.

**Support:** For IDE-related issues, submit issue in [language-features](https://github.com/qingkuai-js/language-features) repository.

---

## Emmet

### Emmet Support

Qingkuai language services provide Emmet support. Dynamic attributes conflict with Emmet's attribute-removal syntax.

### Attribute Removal Syntax

**Qingkuai-specific:** Use `-` instead of `!` for attribute removal

**Syntax:**

```
input[-type]
```

**Result:** Creates `input` tag without `type` attribute

Behavior: Original Emmet removal syntax resolves to Qingkuai dynamic attribute:

```
input[!type]  // Creates: <input !type={}>
```

---

## Formatting

### Document Formatting

**Implementation:** Built-in to language services via [prettier-plugin-qingkuai](https://www.npmjs.com/package/prettier-plugin-qingkuai)

**Prerequisite:** Component file must not contain syntax errors

**Error handling:** If formatting fails, check IDE `output` panel for error details

### Configuration

**Reference:** [docs://misc/config-files.md](docs://misc/config-files.md) for formatting configuration options

---

## Language Service Restart

**Command:** `Qingkuai: Restart Language Server`

**Access:** VS Code command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)

**Use case:** Troubleshoot language service issues

---

## Code Navigation

### Navigation Features

**Slot definition navigation:**

- Action: Hold meta key + left mouse button on slot attribute
- Target: First-level child element slot attributes

**Component definition navigation:**

- Action: Hold meta key + left mouse button on component tag or identifier
- Target: Embedded script component identifiers

**Slot reference finding:**

- Action: Right-click on `slot` tag → "Go to References"
- Alternative: Enable "Code Lens" feature

**Component reference finding:**

- Action: Right-click on embedded language tag → "Go to References"
- Alternative: Enable "Code Lens" feature
