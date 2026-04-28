---
description: "Event binding syntax, handlers, flags, and event delegation patterns."
---

# Scope

Event binding and handling with concise syntax, inline expressions, and functional/key flags.

# Event Binding Syntax

Prefix attribute with `@` followed by event name:

```qk
<button @click={handleClick}>Click</button>
<input @input={handleInput} />
<input @keydown={handleKeydown} />
```

## Handler Types

```qk
<button @click={handleClick}></button>       <!-- function reference -->
<button @click={()=>count++}></button>       <!-- arrow function -->
<button @click={count++}></button>           <!-- inline expression -->
```

## Event Object Access

```js
function handleAddCount(e) {
    count++
    console.log(e.target === this) // true, both point to element
}
```

## Native Event in Inline Handler

```qk
<button @click={$arg => console.log($arg.target)}>Click</button>
```

Default parameter: `$arg` (represents either native event or component parameter).

## Shorthand When Name Matches

```qk
<button @click></button>        <!-- equivalent to: @click={click} -->
```

Constraint: Not supported if event name is keyword (e.g., `class`, `for`).

# Handler Type Detection

Compiler distinguishes inline vs normal handlers:

**Normal handlers** (not wrapped again):

- Standalone identifiers: `identifier`
- Property access: `handlers.click`
- Function declarations: `function(){}`
- Arrow functions: `() => {}`

**Inline handlers** (wrapped):

- Expressions: `count++`
- Conditional calls: `handlers?.click()`
- Ternary: `n > 10 ? yes() : no()`

Inline handlers auto-bind `this` when calling other methods.

# Event Handler Flags

## Functional Flags

```qk
<button @click|self|once={console.log("ok")}>
    Click <span>Me</span>
</button>
```

| Flag      | Effect                                                 |
| --------- | ------------------------------------------------------ |
| `self`    | Execute only when `event.target` is the element itself |
| `stop`    | Call `stopPropagation()` after handler                 |
| `prevent` | Call `preventDefault()` after handler                  |
| `once`    | Remove handler after first run                         |
| `capture` | Trigger during capture phase                           |
| `passive` | Browser optimization: `preventDefault` never called    |

## Key Flags

Regular keys (for `keyup`, `keydown`, etc.):

```qk
<input @keydown|enter={handleEnter} />
<input @keydown|tab={handleTab} />
<input @keydown|del|esc={handleDelete} />
```

Supported: `enter`, `tab`, `del`, `esc`, `up`, `down`, `left`, `right`, `space`

System keys:

```qk
<button @click|alt|shift={handleClick}>Click</button>
```

Supported: `meta`, `alt`, `ctrl`, `shift`

# Event Delegation

Qingkuai automatically enables event delegation for common event types (reduces memory usage for large dynamic lists):

**Form/Input**: `beforeinput`, `input`, `change`
**Keyboard**: `keydown`, `keypress`, `keyup`
**Mouse/Menu**: `click`, `dblclick`, `mousedown`, `mousemove`, `mouseup`, `mouseover`, `mouseout`, `contextmenu`
**Clipboard**: `copy`, `cut`, `paste`
**Drag**: `drag`, `dragstart`, `dragenter`, `dragover`, `dragleave`, `drop`, `dragend`
**Pointer**: `pointerdown`, `pointermove`, `pointerover`, `pointerout`, `pointerup`, `pointercancel`
**Selection**: `select`, `selectionchange`, `selectstart`
**Touch**: `touchstart`, `touchmove`, `touchend`, `touchcancel`

# TypeScript Event Types

When using TypeScript, `$arg` type is strictly inferred:

- `@keydown`: `KeyboardEvent`
- `@click`: `MouseEvent`
- etc.
