# Built-in Elements

In Qingkuai, built-in elements are used to extend template syntax and provide stronger expressive power than standard HTML. They usually take on special framework-level responsibilities with specific semantics and behavior, and they play an important role when handling rendering logic or control structures. Built-in elements are typically prefixed with `qk:` to avoid conflicts with future built-in HTML tags or taking over component naming space.

---

## Spread

In the example code of previous chapters, we have already used the `qk:spread` built-in element many times. Its main role is to act as a virtual mounting point for directives, so all of its child elements are affected together by the mounted directives. Most importantly, it is not rendered as an actual HTML element, so it does not interfere with the final page structure.

Suppose we want to create multiple `p + button` elements in a loop but do not want to introduce an extra meaningless parent element, we can do this:

```qk
<qk:spread #for={3}>
    <p>...</p>
    <button>Click Me</button>
</qk:spread>
```

Another example is when we need to conditionally show multiple `li` elements:

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

When slot content consists of multiple sibling elements:

```qk
<Component>
    <qk:spread #slot={"default"}>
        <p>some</p>
        <p>contents</p>
    </qk:spread>
</Component>
```

Adding a directive to a text node:

```qk
<qk:spread
    #await={pms}
    #then={target}
>
    {target} is loaded.
</qk:spread>
```

> [!TIP]
> One common point can be seen: `qk:spread` is usually used to add directives uniformly to multiple sibling elements that do not share a common parent, which is also exactly what the word “spread” in its name conveys: to scatter, to spread out.
