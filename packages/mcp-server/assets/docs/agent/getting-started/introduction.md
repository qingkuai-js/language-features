---
description: "Qingkuai framework overview: reactive-variable and component-based programming model, embedded language tags, design philosophy, and core advantages over other frameworks."
keywords: ["introduction", "overview", "design philosophy", "virtual dom", "reactivity", "轻快"]
---

# Introduction

Qingkuai (from Chinese "轻快" — lightweight, fast, nimble) is a framework for building web interfaces. It provides a programming model based on reactive variables and componentized interfaces; a compiler transforms `.qk` files into minimal, efficient, strictly optimized JavaScript.

## Component anatomy

Component scripts live inside embedded language tags (`lang-js`, `lang-ts`, `lang-css`, `lang-scss`, `lang-sass`, `lang-less`, `lang-postcss`, `lang-stylus`); content outside them is the HTML template. Plain `script`/`style` tags are NOT processed by the compiler — their raw content is inserted into the page as in normal HTML.

```qk
<lang-js>
    let count = 0
    let name = "World"

    setTimeout(() => {
        name = "Qingkuai"
    }, 1000)
</lang-js>

<h1> Hello {name}! </h1>

<button
    class="btn"
    @click={count++}
>
    You have clicked {count} times.
</button>

<lang-scss>
    // Add styles for the HTML elements in the component here...
</lang-scss>
```

## Design philosophy

Introduce as little new syntax as possible and prioritize habits from mainstream frameworks (Vue/Svelte templates look familiar intentionally); adjust only when an existing design is clearly unreasonable. `lang-*` tags replace `script`/`style` as embedded tags mainly because Textmate-based highlighting breaks when those tags carry multiple attributes and line breaks.

## Core advantages

- **Bundle size**: runtime ≈ 8–24 KB (5–11 KB gzipped), highly tree-shakable (down to per-directive granularity); compiled output is typically 20%–80% of comparable frameworks' output.
- **Reactivity inference**: the compiler infers reactivity from how top-level identifiers are accessed and written — script code stays close to native JS/TS (e.g. a plain `const person = {...}` used in the template gets reactive properties without any marker).
- **TypeScript out of the box**: no extra configuration; the language server infers component and slot-context types automatically.
- **Debugging**: development mode avoids reactive-declaration noise and adds matching declarations for directive-declared context identifiers (`#for`, `#slot`).
- **Update granularity**: no Virtual DOM — reactive changes map directly to native DOM API calls (e.g. a click updates just `pElement.textContent = ...`), removing diff overhead.

## See also

- [Installation](docs://agent/getting-started/install.md)
- [Component Basics](docs://agent/components/basic.md)
- [Reactivity](docs://agent/basic/reactivity.md)
