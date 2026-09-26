---
description: "Qingkuai built-in elements: qk:spread as a virtual directive mounting point for sibling groups and text nodes, rendered as nothing."
keywords: ["built-in element", "qk:spread", "virtual element", "内置元素"]
---

# Built-in Elements

Built-in elements are used to extend template syntax and take on special framework-level responsibilities, providing stronger expressive power than standard HTML. They are prefixed with `qk:` to avoid conflicts with future built-in HTML tags or taking over component naming space.

## Syntax

| Element | Syntax | Meaning |
|---|---|---|
| `qk:spread` | `<qk:spread #for={...}>...</qk:spread>` | Virtual mounting point for directives; all child elements are affected together by the mounted directives; NOT rendered as an actual HTML element |

## Rules

1. Use `qk:spread` to apply directives uniformly to multiple sibling elements that do not share a common parent — that is exactly what the word "spread" in its name conveys: to scatter, to spread out.
2. Typical cases: `#for` creating multiple `p + button` elements in a loop, `#if` conditionally showing several `li`, `#slot` wrapping slot content made up of multiple sibling elements.
3. It can also attach a directive to a text node.
4. Prefer `qk:spread` over additionally introducing meaningless parent elements — it does not interfere with the final page structure.

## Examples

Loop-rendering sibling groups without a wrapper:

```qk
<qk:spread #for={3}>
    <p>...</p>
    <button>Click Me</button>
</qk:spread>
```

Conditionally showing multiple list items:

```qk
<lang-js>
    let visible = true
</lang-js>

<ul class="list">
    <li>normal list 1</li>
    <li>normal list 2</li>
    <qk:spread #if={visible}>
        <li>extra list 3</li>
        <li>extra list 4</li>
    </qk:spread>
</ul>
```

Multi-element slot content:

```qk
<Component>
    <qk:spread #slot={"default"}>
        <p>some</p>
        <p>contents</p>
    </qk:spread>
</Component>
```

Directive on a text node:

```qk
<lang-js>
    const pms = Promise.resolve("data")
</lang-js>

<qk:spread
    #await={pms}
    #then={target}
>
    {target} is loaded.
</qk:spread>
```

## See also

- [Compilation Directives](docs://agent/basic/compilation-directives.md)
- [Slots](docs://agent/components/slots.md)
