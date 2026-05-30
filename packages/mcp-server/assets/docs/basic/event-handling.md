---
description: ""
---

# Event Handling

In frontend development, user interaction with the page is often driven by events. Qingkuai provides concise and intuitive event binding syntax, making it easy to add click, input, keyboard, and other event handling logic to elements so that you can build responsive interactive experiences.

In Qingkuai, attributes starting with `@` are used to bind event handlers. For example, `@click` listens for click events. This syntax is similar to the `onclick` attribute in HTML, but more powerful: you can write arbitrary expressions inside interpolation blocks as event handling logic, which is both more concise and more expressive.

---

## Binding Events

The following code binds a click event to a `button`. When the button is clicked, the `handleAddCount` method is called:

```qk
<lang-js>
    let count = 0

    function handleAddCount(){
        count++ // modifying a reactive variable updates the p element automatically
    }
</lang-js>

<p>current count: {count}</p>
<button @click={handleAddCount}>Add Count</button>
```

Functions such as `handleAddCount` are called event handlers. They can declare parameters to receive the event object, which is consistent with native `addEventListener` behavior:

|js|ts|

```js
function handleAddCount(e) {
    count++
    console.log(e.target === this) // true, both point to the clicked button element
}
```

```ts
function handleAddCount(this: HTMLButtonElement, e: MouseEvent) {
    count++
    console.log(e.target === this) // true, both point to the clicked button element
}
```

Just like [dynamic attributes](docs://basic/interpolation.md#dynamic-attributes), when the event name is the same as the variable name, the interpolation block can be omitted. The following two forms are equivalent:

```qk
<button @click></button>
<button @click={click}></button>
```

<div class="custom-block warning">If the event name is a keyword or reserved word in the embedded script language, this syntax is not supported, such as <code>class</code> or <code>for</code>.</div>

---

## Inline Event Handlers

In the example above, the handler contains only one line of code, so declaring a separate method may seem unnecessary. In this case, there are two ways to simplify the code:

1. Use an arrow function as the event handler:

    ```qk
    <button @click={() => count++}>Add Count</button>
    ```

2. Use inline event handler syntax by writing a JS/TS expression directly in the interpolation block:

    ```qk
    <button @click={count++}>Add Count</button>
    ```

An inline event handler in the second form is compiled into code similar to this:

```qk
<button @click={$arg => count++}>Add Count</button>
```

So you can also access the native event object through `$arg` in an inline event handler:

```qk
<button @click={$arg => console.log($arg.target)}>Add Count</button>
```

<div class="custom-block tip">
    From the perspective of native events, naming <code>$arg</code> as <code>$event</code> might feel more intuitive. However, to keep the semantics consistent, Qingkuai uses <code>$arg</code> as the default parameter name because it also covers arbitrary parameters passed into <a href="docs://components/basic.md">component</a> inline event handlers. In other words, <code>$arg</code> can represent either a native event object or any parameter passed from a component.
</div>

If you call other methods inside an inline event handler, Qingkuai automatically binds `this` in the called methods to the current element:

|js|ts|

```qk
<lang-js>
    let count = 0

    function handleAddCount(e) {
        count++
        console.log(e.target === this) // true, both point to the clicked button element
    }
</lang-js>

<p>current count: {count}</p>
<button @click={handleAddCount($arg)}>Add Count</button>
```

```qk
<lang-ts>
    let count = 0

    function handleAddCount(this: HTMLButtonElement, e: MouseEvent) {
        count++
        console.log(e.target === this) // true, both point to the clicked button element
    }
</lang-ts>

<p>current count: {count}</p>
<button @click={handleAddCount($arg)}>Add Count</button>
```

<div class="custom-block tip">
    If your embedded script language is <a href="https://www.typescriptlang.org">TypeScript</a>, the type of <code>$arg</code> is strictly inferred. For example, for <code>@keydown</code> it is <a href="https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent">KeyboardEvent</a>; for <code>@click</code> it is <a href="https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent">MouseEvent</a>.
</div>

---

## Handler Type Detection

At this point you may wonder: when is a handler considered inline, and when is it treated as a normal event handler? From the Qingkuai compiler's point of view, inline event handlers are interpolation expressions that need to be compiled into a wrapped function. When the interpolation expression is a standalone identifier, a property access expression, a function declaration, or an arrow function, the compiler treats it as a complete function and does not wrap it again, so it is considered a normal event handler:

```qk
<!-- normal event handlers -->
<tag @click={()=>{}}></tag>

<tag @click={identifier}></tag>

<tag @click={handlers.click}></tag>

<tag @click={function(){}}></tag>

<tag @click={function unnamed(){}}></tag>

<!-- inline event handlers -->
<tag @click={count++}></tag>

<tag @click={handlers?.click()}></tag>

<tag @click={n > 10 ? yes() : no()}></tag>
```

---

## Event Handler Flags

Qingkuai allows you to append flags after an event name to simplify common interaction logic. The currently supported flag types are as follows:

1. Functional flags:
   - `self`: execute the bound event handler only when `event.target` is the element itself, without preventing the event from firing.
   - `stop`: call [stopPropagation](https://developer.mozilla.org/en-US/docs/Web/API/Event/stopPropagation) at the end of the handler to stop bubbling.
   - `prevent`: call [preventDefault](https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault) at the end of the handler to prevent the default behavior.
   - `once`: remove the event handler after it runs once, equivalent to [addEventListener options.once](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#options).
   - `capture`: trigger the bound handler during the capture phase, equivalent to [addEventListener options.capture](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#options).
   - `passive`: tell the browser that `event.preventDefault` will never be called in the handler, commonly used for mobile performance optimization, equivalent to [addEventListener options.passive](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#options).

2. Key flags: the event handler runs only while the relevant keys are held down. These flags can be used only on keyboard-related events such as `keyup` and `keydown`:
   - regular key flags: `enter`, `tab`, `del`, `esc`, `up`, `down`, `left`, `right`, `space`
   - system key flags: `meta`, `alt`, `ctrl`, `shift`

Here are some examples of passing flags to event handlers:

```qk
<!-- Only clicking the text area Click, not the span area, triggers the handler, and it runs only once -->
<button @click|self|once={console.log("ok")}>
    Click <span>Me</span>
</button>

<!-- The handler is triggered only when alt and shift are both held down while clicking the button -->
<button @click|alt|shift={console.log("ok")}> Click Me </button>
```

---

## Event Delegation

Qingkuai uses the Event Delegation pattern. This is a common event handling technique that takes advantage of [event bubbling](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/Event_bubbling) by binding listeners to parent elements instead of binding one listener for each child element. This can significantly reduce memory usage and improve performance, especially when handling a large number of dynamically created elements. The compiler automatically enables event delegation for the following event types:

- form and input events: `beforeinput`, `input`, `change`
- keyboard events: `keydown`, `keypress`, `keyup`
- mouse and menu events: `click`, `dblclick`, `mousedown`, `mousemove`, `mouseup`, `mouseover`, `mouseout`, `contextmenu`
- clipboard events: `copy`, `cut`, `paste`
- drag events: `drag`, `dragstart`, `dragenter`, `dragover`, `dragleave`, `drop`, `dragend`
- pointer events: `pointerdown`, `pointermove`, `pointerover`, `pointerout`, `pointerup`, `pointercancel`
- selection events: `select`, `selectionchange`, `selectstart`
- touch events: `touchstart`, `touchmove`, `touchend`, `touchcancel`
