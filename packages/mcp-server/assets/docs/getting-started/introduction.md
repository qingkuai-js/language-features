---
description: "Getting-started syntax baseline: component file structure, embedded language tags, and compiler-processed tag rules."
---

# Scope

Baseline syntax needed before using basic/components references.

# Component File Structure

```qk
<lang-js>
    // JavaScript code
</lang-js>

<h1>Template HTML</h1>

<lang-scss>
    // Styles
</lang-scss>
```

Embedded language tags: `lang-js`, `lang-ts`, `lang-css`, `lang-scss`, `lang-sass`, `lang-less`, `lang-postcss`, `lang-stylus`.

`<script>` and `<style>` tags are NOT processed by the compiler and inserted as-is.

# Rules

- Use `lang-*` tags for compiler-handled script/style blocks.
- Content outside `lang-*` tags is template markup.
- Raw `<script>` and `<style>` are preserved as plain HTML tags.
