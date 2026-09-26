---
description: "Binds DOM and component events via @-attributes: method references, inline handlers with $arg, event handler flags, and compiler-managed event delegation."
keywords: ["events", "@click", "@keydown", "$arg", "event handler flags", "event delegation", "事件", "事件处理"]
---

# Event Handling

## Syntax

Attributes starting with `@` bind event handlers (e.g. `@click` listens for click events):

| Form | Meaning |
| --- | --- |
| `@click={handleAddCount}` | Method reference; the handler receives the native event object as first parameter, consistent with native `addEventListener` behavior |
| `@click` | Shorthand for `@click={click}`; valid only when the event name is the same as the variable name |
| `@click={() => count++}` | Arrow function used directly as the event handler |
| `@click={count++}` | Inline event handler: a JS/TS expression written directly in the interpolation block, compiled into a wrapped `$arg => count++` |
| `@click={handleAddCount($arg)}` | Call expression inside an inline handler; `this` in the called method is auto-bound to the current element |
| `@click\|self\|once={...}` | Event handler flags appended after the event name with `\|` |

Event object access: normal handlers declare a parameter (`e.target === this`, both point to the clicked element); inline handlers use `$arg` — the native event object on elements, or any parameter passed from a component inline event handler. With `<lang-ts>`, the type of `$arg` is strictly inferred: `KeyboardEvent` for `@keydown`, `MouseEvent` for `@click`.

Functional flags:

| Flag | Meaning |
| --- | --- |
| `self` | Execute the handler only when `event.target` is the element itself, without preventing the event from firing |
| `stop` | Call `stopPropagation` at the end of the handler to stop bubbling |
| `prevent` | Call `preventDefault` at the end of the handler to prevent the default behavior |
| `once` | Remove the handler after it runs once (`addEventListener` `options.once`) |
| `capture` | Trigger the handler during the capture phase (`options.capture`) |
| `passive` | Tell the browser `event.preventDefault` will never be called in the handler; mobile performance optimization (`options.passive`) |

Key flags — the handler runs only while the relevant keys are held down; usable only on keyboard-related events such as `keyup` and `keydown`:

| Flag | Meaning |
| --- | --- |
| `enter` `tab` `del` `esc` `up` `down` `left` `right` `space` | Regular key flags |
| `meta` `alt` `ctrl` `shift` | System key flags |

## Rules

1. Every attribute starting with `@` binds an event handler; the token after `@` is the event name (e.g. `@click`, `@keydown`).
2. Normal handlers behave like native `addEventListener` callbacks: the first parameter is the event object, and `this` is the bound element.
3. `@click` without an interpolation block is equivalent to `@click={click}`; this shorthand is unsupported when the event name is a keyword or reserved word in the embedded script language, such as `class` or `for`.
4. The compiler treats the interpolation expression as a normal (unwrapped) event handler when it is a standalone identifier, a property access expression, a function declaration (named or unnamed), or an arrow function: `@click={identifier}`, `@click={handlers.click}`, `@click={function(){}}`, `@click={function unnamed(){}}`, `@click={()=>{}}`.
5. Any other interpolation expression compiles into an inline event handler wrapped as `$arg => ...`: `@click={count++}`, `@click={handlers?.click()}`, `@click={n > 10 ? yes() : no()}`.
6. `$arg` (not `$event`) is the fixed default parameter name of compiled inline event handlers.
7. If you call other methods inside an inline event handler, Qingkuai automatically binds `this` in those methods to the current element, so `@click={handleAddCount($arg)}` can still read `this` as the element.
8. Flags chain after the event name with `|` (e.g. `@click|self|once`). System key flags combine with AND semantics: `@click|alt|shift` triggers only when alt and shift are both held down.
9. The compiler automatically enables event delegation (bubbling-based listeners bound to parent elements) for these event types: `beforeinput` `input` `change`; `keydown` `keypress` `keyup`; `click` `dblclick` `mousedown` `mousemove` `mouseup` `mouseover` `mouseout` `contextmenu`; `copy` `cut` `paste`; `drag` `dragstart` `dragenter` `dragover` `dragleave` `drop` `dragend`; `pointerdown` `pointermove` `pointerover` `pointerout` `pointerup` `pointercancel`; `select` `selectionchange` `selectstart`; `touchstart` `touchmove` `touchend` `touchcancel`.

## Constraints

- Key flags can be used only on keyboard-related events such as `keyup` and `keydown`.
- `self` gates only whether the handler executes; it never prevents the event from firing.
- `stop` and `prevent` take effect at the end of the handler, not before the handler body.
- `passive` is a commitment that `preventDefault` is never called in that handler.
- The `@click` shorthand form cannot be used when the event name is a keyword or reserved word (`class`, `for`).

## Examples

Method reference; modifying a reactive variable updates the view automatically:

```qk
<lang-js>
    let count = 0

    function handleAddCount(e) {
        count++ // modifying a reactive variable updates the p element automatically
        console.log(e.target === this) // logs: true
    }
</lang-js>

<p>current count: {count}</p>
<button @click={handleAddCount}>Add Count</button>
```

Inline handler with `$arg`, and auto-bound `this` in a called method:

```qk
<lang-ts>
    let count = 0

    function handleAddCount(this: HTMLButtonElement, e: MouseEvent) {
        count++
        console.log(e.target === this) // logs: true
    }
</lang-ts>

<p>current count: {count}</p>
<button @click={handleAddCount($arg)}>Add Count</button>
<button @click={$arg => console.log($arg.target)}>Log Target</button>
```

Flags: `self|once` gating, and combined system key flags:

```qk
<lang-js>
    let clicks = 0
</lang-js>

<button @click|self|once={clicks++}>Click <span>Me</span></button>
<button @click|alt|shift={console.log("ok")}>Click Me</button>
```

## See also

- [Reference Attributes](docs://agent/basic/reference-attributes.md)
- [Forms](docs://agent/basic/forms.md)
