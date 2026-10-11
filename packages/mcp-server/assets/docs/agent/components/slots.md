---
description: "Declaring slot outlets, named slots, fallback content, scoped slot context, and slot presence checks in Qingkuai components."
keywords: ["slot", "slots", "scoped slot", "slot context", "插槽", "作用域插槽"]
---

# Slots

Slots pass structured UI content — template fragments — into a component, while attributes pass data. Inside the child, the `slot` tag declares the insertion point (the slot outlet); the child element(s) written on the component tag are the slot content.

## Syntax

| Feature | Child (slot outlet) | Parent (slot content) |
|---|---|---|
| Default slot | `<slot></slot>` | `<Inner>...</Inner>` |
| Named slot | `<slot name="footer"></slot>` | `<p #slot={"footer"}>...</p>` |
| Explicit default name | (unnamed slot is named `default`) | `<div #slot={"default"}>...</div>` (name omittable) |
| Virtual parent (text-only / no wrapper) | — | `<qk:spread #slot={"footer"}>...</qk:spread>` |
| Fallback content | `<slot>Default content</slot>` | (no content passed) |
| Context passing | `<slot !time={article.time} !title={article.title}></slot>` | `#slot={articleInfo from "default"}` |
| Context destructuring | — | `#slot={{ title, time } from "default"}` |
| Presence check | `#if={slots.footer}` | — |

The built-in `slots` object maps slot names to booleans: `true` when that slot was passed from outside, otherwise `false`.

## Rules

1. Slot content can be any valid template content: text, elements, components, and directives (e.g. `#for`).
2. Slot content can access data only from the component scope where it is written; child data is reachable only through slot context.
3. A slot without a `name` attribute is named `default`. Target slots with the `slot` directive `#slot={...}`; the name may be omitted when it is `default`.
4. Child elements inside the `slot` tag are the slot's default (fallback) content, rendered when no slot content is passed from outside.
5. Attributes added to the `slot` tag are passed as context to the slot content; receive them at the outlet via `identifier from "slotName"` or by destructuring `{{ a, b } from "slotName"}`.
6. `#if={slots.footer}`-style checks let a component render parts of its structure conditionally on whether a specific slot was passed.

## Constraints

- The `name` attribute on a `slot` tag is used only to specify the slot name; it is not passed into slot content.
- Destructured context values usually lose their reactivity; a value that is itself a reactive complex structure keeps reactive property access.
- When slot content is text-only, or to avoid adding meaningless wrapper tags, use the `qk:spread` built-in element as a virtual parent.

## Examples

### Default and named slots

```qk
<!-- Article.qk -->
<article>
    <slot></slot>
</article>
<footer>
    <slot name="footer">Default footer</slot>
</footer>
```

```qk
<!-- Outer.qk -->
<lang-js>
    import Article from "./Article.qk"
</lang-js>

<Article>
    <qk:spread>Article contents...</qk:spread>
    <qk:spread #slot={"footer"}>
        <p>Release information...</p>
    </qk:spread>
</Article>
```

### Scoped slot context

```qk
<!-- Article.qk -->
<lang-js>
    const article = { time: "2026-09-01", title: "Hello" }
</lang-js>

<article>
    <slot !time={article.time} !title={article.title}></slot>
</article>
```

```qk
<!-- Outer.qk -->
<lang-js>
    import Article from "./Article.qk"
</lang-js>

<Article>
    <qk:spread #slot={{ title, time } from "default"}>
        <h1>{title}</h1>
        <p>Published in {time}</p>
    </qk:spread>
</Article>
```

### Render by slot presence

```qk
<!-- Panel.qk -->
<section class="panel">
    <div class="panel-content">
        <slot></slot>
    </div>
    <footer class="panel-footer" #if={slots.footer}>
        <slot name="footer"></slot>
    </footer>
</section>
```

## See also

- [Component Attributes](docs://agent/components/attributes.md)
- [Compilation Directives](docs://agent/basic/compilation-directives.md)
