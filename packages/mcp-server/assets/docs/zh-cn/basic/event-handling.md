# 事件处理

在前端开发中，用户与页面的交互往往通过事件驱动。Qingkuai 提供了简洁直观的事件绑定语法，使你可以轻松为元素添加点击、输入、键盘等各种事件处理逻辑，帮助实现响应式的交互体验。

在 Qingkuai 中，以 `@` 字符开头的属性用于绑定事件处理器，例如 `@click` 表示监听点击事件。这种语法与 HTML 中的 `onclick` 属性类似，但更强大：支持使用插值块编写任意表达式作为事件处理逻辑，不仅更简洁，也更具表现力。

---

## 绑定事件

下面这段代码为 button 元素绑定了一个点击事件，按钮被点击时，`handleAddCount` 方法会被调用：

```qk
<lang-js>
    let count = 0

    function handleAddCount(){
        count++ // 修改响应性变量，p元素内容会被自动更新
    }
</lang-js>

<p>current count: {count}</p>
<button @click={handleAddCount}>Add Count</button>
```

像 `handleAddCount` 这样的函数被称为事件处理器，它们可以声明参数来接收事件对象，这一点与原生调用 `addEventListener` 时的行为是一致的：

|js|ts|

```js
function handleAddCount(e) {
    count++
    console.log(e.target === this) // logs: true
}
```

```ts
function handleAddCount(this: HTMLButtonElement, e: MouseEvent) {
    count++
    console.log(e.target === this) // logs: true
}
```

与[动态属性](docs://zh-cn/basic/interpolation.md#动态属性)一样，事件与变量名称一致时可省略插值块，所以下面两种写法等效：

```qk
<button @click></button>
<button @click={click}></button>
```

> [!WARNING]
> 若事件名称是嵌入脚本语言中的关键字或保留字，则不支持这种语法，如 `class` 或 `for` 属性等。

---

## 内联事件处理器

在上方示例中，事件处理器仅包含一行代码，因此我们似乎没有必要单独为其声明一个方法。此时我们有两种方式简化代码：

1.  使用箭头函数作为事件处理器：

    ```qk
    <button @click={() => count++}>Add Count</button>
    ```

2.  使用内联事件处理器语法，即在插值块中直接编写 JS/TS 表达式：

    ```qk
    <button @click={count++}>Add Count</button>
    ```

第二种方法中的内联事件处理器会被编译器处理为类似下面的代码：

```qk
<button @click={$arg => count++}>Add Count</button>
```

| 所以我们还可以在内联事件处理器中通过 `$arg` 访问原生事件对象：

```qk
<button @click={$arg => console.log($arg.target)}>Add Count</button>
```

> [!TIP]
> 从原生事件的角度来看，将 `$arg` 命名为 `$event` 可能更直观；但从语义一致性的角度出发，使用 $arg 更能涵盖我们之后将介绍的[组件](docs://zh-cn/components/basic.md)内联事件处理器所传入的任意参数。因此，在 Qingkuai 中我们统一使用 $arg 作为事件处理器的默认参数名，以体现其在组件与原生事件中的通用性：它既可以表示原生事件对象，也可以表示组件传入的任意参数。

如果你在内联事件处理器中调用了其他方法，Qingkuai 会自动将这些被调用方法中的 this 绑定为当前元素：

|js|ts|

```qk
<lang-js>
    let count = 0

    function handleAddCount(e) {
        count++
        console.log(e.target === this) // logs: true
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
        console.log(e.target === this) // logs: true
    }
</lang-ts>

<p>current count: {count}</p>
<button @click={handleAddCount($arg)}>Add Count</button>
```

> [!TIP]
> 如果你的嵌入脚本语言类型为 [TypeScript](https://www.typescriptlang.org)，`$arg` 的类型是严格的。例如：对于 `@keydown` 事件，它的类型是 [KeyboardEvent](https://developer.mozilla.org/zh-CN/docs/Web/API/KeyboardEvent)；对于 `@click` 事件，它的类型是 [MouseEvent](https://developer.mozilla.org/zh-CN/docs/Web/API/MouseEvent)。

---

## 处理器类型判定

看到这里你可能会有一个疑问：什么情况下是内联事件处理器，什么情况下又是普通事件处理器？在 Qingkuai 编译器的视角中，内联事件处理器指的是那些需要被编译为包裹在函数中的插值表达式；而当插值表达式是单独的标识符、属性访问表达式、函数声明或箭头函数时，编译器会将其认作完整函数，因而无需额外包裹，属于普通事件处理器：

```qk
<!-- 普通事件处理器 -->
<tag @click={()=>{}}></tag>

<tag @click={identifier}></tag>

<tag @click={handlers.click}></tag>

<tag @click={function(){}}></tag>

<tag @click={function unnamed(){}}></tag>

<!-- 内联事件处理器 -->
<tag @click={count++}></tag>

<tag @click={handlers?.click()}></tag>

<tag @click={n > 10 ? yes() : no()}></tag>
```

---

## 事件处理器标志

Qingkuai 允许在事件名称后附加一些标志，用于简化常见交互需求的代码编写。目前支持的标志类型包括以下几种：

1.  功能性标志：
    - self：仅当 `event.target` 是自身时才执行绑定的事件处理器（不阻止触发）；
    - stop：在事件处理器的最后调用 [stopPropagation](https://developer.mozilla.org/zh-CN/docs/Web/API/Event/stopPropagation) 以阻止冒泡传播；
    - prevent：在事件处理器的最后调用 [preventDefault](https://developer.mozilla.org/zh-CN/docs/Web/API/Event/preventDefault) 以阻止默认行为；
    - once：事件处理器在第一次被触发并执行后会被移除，效果同 [addEventListener options.once](https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener#options)；
    - capture：是否在捕获阶段触发绑定的事件处理器，效果同 [addEventListener options.capture](https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener#options)；
    - passive：告知客户端事件处理器中永远不会调用 `event.preventDefault`，多用于移动端性能优化，效果同[addEventListener options.passive](https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener#options)；

2.  按键标志，只有相关按键保持按下才会触发绑定的事件处理器，这些标志只能用于键盘相关事件（keyup、keydown 等）：
    - 普通按键标志：enter、tab、del、esc、up、down、left、right、space；
    - 系统按键标志：meta、alt、ctrl、shift；

以下是一些为事件处理器传递标志的示例：

```qk
<!-- 仅点击 Click 文本区域（非 span 区域）时才触发事件处理器，且只执行一次 -->
<button @click|self|once={console.log("ok")}>
    Click <span>Me</span>
</button>

<!-- 仅当alt键和shift键被同时保持按下且点击按钮时才触发执行事件处理器 -->
<button @click|alt|shift={console.log("ok")}> Click Me </button>
```

---

## 事件委托

Qingkuai 使用了事件委托（Event Delegation）模式。这是一种常见的事件处理方式：利用[事件冒泡](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Scripting/Event_bubbling)机制，将事件监听器绑定到父元素上，而不是为每个子元素分别绑定监听器。这种方式可以显著减少内存占用并提升性能，尤其适合处理大量动态生成的元素。编译器会对以下事件类型自动启用事件委托：

- 表单与输入事件：beforeinput、input、change；
- 键盘事件：keydown、keypress、keyup；
- 鼠标与菜单事件：click、dblclick、mousedown、mousemove、mouseup、mouseover、mouseout、contextmenu；
- 剪贴板事件：copy、cut、paste；
- 拖拽事件：drag、dragstart、dragenter、dragover、dragleave、drop、dragend；
- 指针事件：pointerdown、pointermove、pointerover、pointerout、pointerup、pointercancel；
- 选择事件：select、selectionchange、selectstart；
- 触摸事件：touchstart、touchmove、touchend、touchcancel。
