# Built-in Elements

In Qingkuai, built-in elements extend template syntax and provide stronger expressive power than standard HTML. They usually take on framework-level responsibilities with specific semantics and behavior, and they play an important role when handling rendering logic or control structures. Built-in elements are typically prefixed with `qk:` to avoid conflicts with future built-in HTML tags or taking over component naming space.

---

## Spread

In previous chapters, we have already used the `qk:spread` built-in element many times. Its main role is to act as a virtual mounting point for directives, so all of its child elements are affected together by the mounted directives. Most importantly, it is not rendered as an actual HTML element, so it does not interfere with the final page structure.

Suppose you want to create multiple `p + button` groups in a loop without introducing an extra meaningless parent element:

```qk
<qk:spread #for={3}>
    <p>...</p>
    <button>Click Me</button>
</qk:spread>
```

Another example is conditionally showing multiple `li` elements at once:

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

Or when slot content consists of multiple sibling elements:

```qk
<Component>
    <qk:spread #slot={"default"}>
        <p>some</p>
        <p>contents</p>
    </qk:spread>
</Component>
```

You can also use it to attach a directive to a text node:

```qk
<qk:spread
    #await={pms}
    #then={target}
>
    {target} is loaded.
</qk:spread>
```

<div class="custom-block tip">
    These examples share one common pattern: <code>qk:spread</code> is usually used to apply directives uniformly to multiple sibling nodes that do not share a common parent. This is also what the word “spread” in its name conveys.
</div>
