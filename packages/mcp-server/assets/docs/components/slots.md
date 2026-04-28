---
description: "Component slots: basic usage, default content, named slots, context passing, and conditional rendering."
---

# Scope

Slots for passing template fragments (UI structure) into components.
`qk:spread` syntax reference: docs://misc/builtin-elements.md.
`#slot` directive reference: docs://basic/compilation-directives.md.

# Basic Slot Usage

```qk
<!-- Inner.qk (child) -->
<div class="inner-box">
    <slot></slot>    <!-- slot outlet -->
</div>

<!-- Outer.qk (parent) -->
<Inner>..content..</Inner>    <!-- slot content -->
```

Rendered result:

```html
<div class="inner-box">..content..</div>
```

# Slot Content Scope

Slot content accesses data from parent (writer's scope):

```qk
<!-- Outer.qk -->
<lang-js>
    const langs = ["js", "ts", "qk"]
</lang-js>
<Inner>
    <p #for={item of langs}>{item}</p>
</Inner>
```

# Default Content

```qk
<!-- Inner.qk -->
<div class="inner-box">
    <slot>Default content</slot>
</div>

<!-- Outer.qk -->
<Inner />
```

Rendered (no slot content provided):

```html
<div class="inner-box">Default content</div>
```

# Named Slots

```qk
<!-- Inner.qk -->
<article>
    <slot></slot>              <!-- unnamed = "default" -->
</article>
<footer>
    <slot name="footer"></slot>
</footer>

<!-- Outer.qk -->
<Inner>
    <div #slot="default">Article content</div>
    <p #slot="footer">Copyright info</p>
</Inner>
```

Rule: Slot `name` identifies target slot only and is not part of slot context data.

## qk:spread for Slot Content

```qk
<Inner>
    <qk:spread>Text content</qk:spread>
    <qk:spread #slot="footer">
        <p>Release info</p>
        <p>Copyright info</p>
    </qk:spread>
</Inner>
```

Behavior: `qk:spread` enables multi-node slot content without emitting wrapper DOM.

# Passing Context from Component

```qk
<!-- Inner.qk -->
<article>
    <slot
        !time={article.time}
        !title={article.title}
    ></slot>
</article>
```

At slot outlet (parent), receive context via `slot` directive:

```qk
<!-- Outer.qk -->
<Inner>
    <qk:spread #slot={articleInfo from "default"}>
        <h1>{articleInfo.title}</h1>
        <p>Published: {articleInfo.time}</p>
    </qk:spread>
</Inner>
```

## Destructuring Context

```qk
<Inner>
    <qk:spread #slot={{ title, time } from "default"}>
        <h1>{title}</h1>
        <p>{time}</p>
    </qk:spread>
</Inner>
```

Warning: After destructuring, values usually lose reactivity. Exception: complex values still track property reactivity.

# Conditional Rendering Based on Slot Presence

```qk
<lang-js>
    // slots is a compiler intrinsic
    // slots.slotName returns boolean: true if passed, false otherwise
</lang-js>

<section>
    <div><slot></slot></div>
    <footer #if={slots.footer}>
        <slot name="footer"></slot>
    </footer>
</section>
```

Behavior: `slots.slotName` supports conditional rendering by slot presence.

# Slot Directive Syntax

```qk
#slot={contextVar from "slotName"}
#slot={{destructured} from "slotName"}
```
