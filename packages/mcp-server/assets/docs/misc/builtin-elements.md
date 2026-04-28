---
description: "Qingkuai built-in elements - virtual mounting points for directives."
---

# Built-in Elements

Built-in elements are compiler-reserved tags prefixed with `qk:`.

## qk:spread

**Syntax:**

```qk
<qk:spread #directive={value}>
    <!-- child elements -->
</qk:spread>
```

Virtual mounting point for directives across sibling nodes without introducing a real wrapper element.

**Key properties:**

- Not rendered as actual HTML element
- Does not interfere with final page structure
- Directives on `qk:spread` apply to all children

### Use Cases

**1. Looping multiple sibling elements:**

```qk
<qk:spread #for={3}>
    <p>Item content</p>
    <button>Click Me</button>
</qk:spread>
```

**2. Conditional rendering of multiple elements:**

```qk
<ul class="list">
    <li>normal list 1</li>
    <li>normal list 2</li>
    <qk:spread #if={visible}>
        <li>extra list 3</li>
        <li>extra list 4</li>
    </qk:spread>
</ul>
```

**3. Slot content with multiple siblings:**

```qk
<Component>
    <qk:spread #slot={"default"}>
        <p>some</p>
        <p>contents</p>
    </qk:spread>
</Component>
```

**4. Directive on text node:**

```qk
<qk:spread
    #await={promise}
    #then={target}
>
    {target} is loaded.
</qk:spread>
```

**Behavior:** `qk:spread` node is not emitted to DOM; directives apply to its child nodes.

---

## Built-in Elements Reference

**Supported elements:**

- `qk:spread` - Virtual container for applying directives to multiple siblings
