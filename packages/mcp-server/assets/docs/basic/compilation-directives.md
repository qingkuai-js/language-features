---
description: "Qingkuai compilation directives: conditional rendering, list rendering, async processing, HTML rendering, target, and priority rules."
---

# Scope

Directives (attributes prefixed with `#`) for flow control, rendering control, and async processing.

# Conditional Rendering

```qk
<p #if={condition}>Only if condition is true</p>
<p #elif={other_condition}>Else if</p>
<p #else>Default</p>
```

Directive values are JavaScript expressions.

# List Rendering

## Basic Syntax

```qk
<p #for={3}>Repeat 3 times</p>
```

Supported data sources: number, array, object, string, Set, Map, or expression evaluating to these.

## Item and Index

```qk
<p #for={item, index of [1, 2, 3]}>{index}: {item}</p>
```

Result:

```html
<p>0: 1</p>
<p>1: 2</p>
<p>2: 3</p>
```

## Map Iteration

```qk
<lang-js>
    const languages = new Map([
        ["qk", "Qingkuai"],
        ["js", "JavaScript"]
    ])
</lang-js>
<p #for={item, index of languages}>{index}: {item}</p>
```

## Destructuring

```qk
<lang-js>
    const languageInfos = {
        qk: { age: 1, name: "Qingkuai" },
        js: { age: 30, name: "JavaScript" }
    }
</lang-js>
<p #for={{ name, age }, extension of languageInfos}>
    {name}: extension is {extension}
</p>
```

## `of` vs `in`

Qingkuai uses `of` (not `in`) because `in` can appear in expressions, causing ambiguity:

```qk
<!-- Ambiguous: prop could be identifier or expression -->
<p #for={prop in obj ? 3 : 2}>...</p>
<!-- Clear: only of syntax -->
<p #for={prop, idx of obj}>...</p>
```

# Key Directive

```qk
<form>
    <input
        #for={user of users}
        #key={user.id}
        !value={user.name}
    />
</form>
```

Behavior: `#key` preserves element-to-data association across reorder/insert/delete operations.

Constraint: Key values converted to strings; duplicates within same list cause runtime error.

# Async Processing

```qk
<p #await={promise}>Waiting...</p>
<p #then={result}>Resolved: {result}</p>
<p #catch={error}>Rejected: {error}</p>
```

## Without Intermediate Content

```qk
<p #await={promise} #then={result}>
    Resolved with: {result}
</p>
```

## Destructuring Context

```qk
<p #then={{ id, name }}>
    User: {name} (ID: {id})
</p>
```

# HTML Directive

```qk
<div #html>{htmlString}</div>
```

Warning: Tag can only contain one text child node.

## Config for Partial Trust

```js
type HTMLDirectiveValueType = Partial<{
    escapeTags: string[]      // tags to escape
    escapeStyle: boolean      // escape style tags
    escapeScript: boolean     // escape script tags
}>
```

Example:

```qk
<lang-js>
    const htmlConf = {
        escapeStyle: true,
        escapeScript: true,
        escapeTags: ["link", "iframe", "form"]
    }
</lang-js>
<p #html={htmlConf}>{htmlString}</p>
```

# Target Directive

```qk
<div #target={"body"}>Mount into body</div>
<div #target={document.body}>Mount into body</div>
```

Value: CSS selector string or HTMLElement instance.

# Directive Priority

Order (high to low):

```
slot > await/then/catch > if/elif/else > target > for/key > html
```

Other directives share `html`'s priority; processing order follows appearance.

## Override with qk:spread

```qk
<!-- Default: if checks first, then for applies to filtered items -->
<p #if={showList} #for={item of items}>{item}</p>

<!-- Override: for processes all items, then if checks each -->
<qk:spread #for={item of items}>
    <p #if={showList}>{item}</p>
</qk:spread>
```

# qk:spread Built-in Element

Virtual mounting point for directives; no element rendered to page. Avoids unnecessary wrapper elements and enables directives on text nodes.
