---
description: "Qingkuai compilation directives: #if/#elif/#else, #for, #key, #await/#then/#catch, #html, #target, #scope, #slot — exact usage forms, semantics, priority order, and constraints."
keywords: ["#if", "#elif", "#else", "#for", "#key", "#await", "#then", "#catch", "#html", "#target", "#scope", "#slot", "qk:spread", "directive", "指令", "条件渲染", "列表渲染", "异步"]
---

# Compilation Directives

Directives are `#`-prefixed special attributes that tell the compiler how to generate JavaScript. Priority chain (high → low): `slot` > `await/then/catch` > `if/elif/else` > `target` > `for/key` > `html`. Unlisted directives process in tag appearance order.

## Syntax

| Directive | Purpose | Form |
|---|---|---|
| `#if` / `#elif` / `#else` | Conditional rendering | `#if={expr}`, `#elif={expr}`, `#else` bare |
| `#for` | List rendering | `#for={n}` or `#for={item, index of source}` |
| `#key` | Node identity inside lists | `#key={expr}` |
| `#await` / `#then` / `#catch` | Async rendering states | `#await={promise}`; `#then` / `#then={res}`; `#catch` / `#catch={err}` |
| `#html` | Render text as HTML fragment | `#html` bare or `#html={config}` |
| `#target` | Mount into another parent element | `#target={cssSelector}` or `#target={HTMLElement}` |
| `#scope` | Pass parent scope attribute to child root | `#scope` bare, component tags only |
| `#slot` | Receive slot context in components | `#slot={name}` |

## Rules

1. `#if` / `#elif` / `#else` mirror JavaScript `if` / `else if` / `else`. `#elif` and `#else` must follow an `#if` branch.
2. `#for` accepts a number, array, object, string, `Set`, `Map`, or an expression evaluating to one of these. `#for={3}` renders three copies.
3. Iteration naming uses `of`: `#for={item, index of source}`. Destructuring is allowed in the item or index position (e.g. `#for={{ name, age }, extension of languageInfos}`).
4. For objects and `Map`, `item` is the value and `index` is the key.
5. The `#for` source uses `of`, never `in` — `in` is a JavaScript operator and would make the directive value ambiguous.
6. Add `#key` when list-rendered elements hold local DOM state (e.g. input values), so nodes are tracked by identity instead of index across insert/remove/reorder.
7. `#await={promise}` renders its tag while waiting; `#then` renders on fulfillment, `#catch` on rejection. Resolved/rejected values are received via an identifier or destructuring in the directive value.
8. When no waiting UI is needed, `#await` and `#then` may be placed on the same tag.
9. `#html` renders text as an HTML fragment (regular interpolation only updates `textContent` with escaping). Its optional value is `Partial<{ escapeTags: string[], escapeStyle: boolean, escapeScript: boolean }>` for keeping partially trusted content escaped.
10. `#target` mounts the node under another parent element (e.g. full-screen modals); its value is a CSS selector string or an `HTMLElement`.
11. `#scope` passes the parent component's scope attribute to the child's root element so that parent styles can override the child component. It composes along the ancestor chain — each `#scope` adds its component's scope attribute to the final root element.
12. When the child's root node is `qk:spread` or another component (no real DOM element), `#scope` walks in and attaches to the first real element.
13. `qk:spread` is a virtual mounting point for directives: it renders nothing, lets one directive apply to all child nodes (including text nodes), and avoids meaningless wrapper elements.
14. Directives on the same tag follow the priority chain; e.g. with `#if` + `#for` together, `#if` decides rendering first. For the reverse behavior, nest: put the higher-priority directive on an outer tag, or use `qk:spread` as the outer container.

## Constraints

- Duplicate `#key` values within one list cause a runtime error (keys are compared as strings; each item's key must be unique).
- A tag using `#html` may contain only one text child node; otherwise the compiler throws a fatal error.
- `#scope` works only on component tags, reaches only the child's root element (never deeper, for runtime performance).
- `#target` accepts only a CSS selector string or an `HTMLElement`.

## Examples

Conditional rendering with `#if` / `#elif` / `#else`:

```qk
<lang-js>
    let language = "qk"
</lang-js>

<p #if={language === "qk"}>Qingkuai</p>
<p #elif={language === "js"}>JavaScript</p>
<p #else>Other language</p>
```

List rendering with `#for` and `#key`:

```qk
<lang-js>
    let users = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" }
    ]
</lang-js>

<input
    #for={user of users}
    #key={user.id}
    !value={user.name}
/>
```

Async processing with `#await` / `#then` / `#catch`:

```qk
<lang-js>
    let pms = new Promise(resolve => {
        setTimeout(() => resolve("done"), 1000)
    })
</lang-js>

<p #await={pms}>waiting...</p>
<p #then={res}>resolved: {res}</p>
<p #catch={err}>rejected: {err}</p>
```

Handling not fully trusted HTML with an escape config:

```qk
<lang-js>
    let htmlStr = "<strong>Qingkuai</strong>"
    const htmlDirectiveConf = {
        escapeStyle: true,
        escapeScript: true,
        escapeTags: ["link", "iframe", "form"]
    }
</lang-js>

<p #html={htmlDirectiveConf}>{htmlStr}</p>
```

Directive priority: outer `#for` drives, inner `#if` filters, `qk:spread` avoids a wrapper element:

```qk
<lang-js>
    let showList = true
    let items = [1, 2, 3]
</lang-js>

<qk:spread #for={item of items}>
    <p #if={showList}>{item}</p>
</qk:spread>
```

## See also

- [Reactivity](docs://agent/basic/reactivity.md)
- [Event Handling](docs://agent/basic/event-handling.md)
- [Slots](docs://agent/components/slots.md)
- [Built-in Elements](docs://agent/misc/builtin-elements.md)
- [Async Components](docs://agent/components/async-components.md)
