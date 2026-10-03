---
description: "通过 @ 属性绑定 DOM 与组件事件：方法引用、带 $arg 的内联处理器、事件处理标志，以及编译器托管的事件委托。"
keywords: ["events", "@click", "@keydown", "$arg", "event handler flags", "event delegation", "事件", "事件处理"]
---

# 事件处理

## 语法

以 `@` 开头的属性绑定事件处理器（如 `@click` 监听 click 事件）：

| 形式 | 含义 |
| --- | --- |
| `@click={handleAddCount}` | 方法引用；处理器像原生 `addEventListener` 一样以原生事件对象为第一个参数 |
| `@click` | `@click={click}` 的简写；仅当事件名与变量名相同时有效 |
| `@click={() => count++}` | 箭头函数直接作为事件处理器 |
| `@click={count++}` | 内联事件处理器：插值块内直接写 JS/TS 表达式，编译为包装后的 `$arg => count++` |
| `@click={handleAddCount($arg)}` | 内联处理器中的调用表达式；被调用方法内的 `this` 自动绑定到当前元素 |
| `@click\|self\|once={...}` | 事件处理标志，以 `\|` 追加在事件名之后 |

事件对象访问：普通处理器声明参数（`e.target === this`，都指向被点击元素）；内联处理器使用 `$arg`，在元素上是原生事件对象，在组件内联事件处理器上则是传入的任意参数。使用 `<lang-ts>` 时 `$arg` 的类型被严格推导：`@keydown` 为 `KeyboardEvent`，`@click` 为 `MouseEvent`。

功能标志：

| 标志 | 含义 |
| --- | --- |
| `self` | 仅当 `event.target` 是元素本身时执行处理器，但不阻止事件触发 |
| `stop` | 在处理器末尾调用 `stopPropagation` 阻止冒泡 |
| `prevent` | 在处理器末尾调用 `preventDefault` 阻止默认行为 |
| `once` | 处理器运行一次后被移除（`addEventListener` 的 `options.once`） |
| `capture` | 在捕获阶段触发处理器（`options.capture`） |
| `passive` | 告知浏览器处理器内绝不会调用 `event.preventDefault`；移动端性能优化（`options.passive`） |

按键标志，只在相关按键按住时运行处理器；仅可用于 `keyup`、`keydown` 等键盘相关事件：

| 标志 | 含义 |
| --- | --- |
| `enter` `tab` `del` `esc` `up` `down` `left` `right` `space` | 普通按键标志 |
| `meta` `alt` `ctrl` `shift` | 系统按键标志 |

## 规则

1. 每个以 `@` 开头的属性绑定一个事件处理器；`@` 之后的标记是事件名（如 `@click`、`@keydown`）。
2. 普通处理器行为等同原生 `addEventListener` 回调：第一个参数是事件对象，`this` 是被绑定元素。
3. 不带插值块的 `@click` 等价于 `@click={click}`；事件名是嵌入脚本语言的关键字或保留字（如 `class`、`for`）时不支持该简写。
4. 当插值表达式是独立标识符、属性访问表达式、函数声明（具名或匿名）或箭头函数时，编译器视其为普通（不包装的）事件处理器：`@click={identifier}`、`@click={handlers.click}`、`@click={function(){}}`、`@click={function unnamed(){}}`、`@click={()=>{}}`。
5. 其他任何插值表达式都会被编译为包装成 `$arg => ...` 的内联事件处理器：`@click={count++}`、`@click={handlers?.click()}`、`@click={n > 10 ? yes() : no()}`。
6. `$arg`（不是 `$event`）是编译后的内联事件处理器的固定默认参数名。
7. 在内联事件处理器中调用其他方法时，Qingkuai 自动把这些方法内的 `this` 绑定到当前元素，因此 `@click={handleAddCount($arg)}` 仍能把 `this` 读作元素。
8. 标志以 `|` 链接在事件名之后（如 `@click|self|once`）。系统按键标志按 AND 组合：`@click|alt|shift` 只在 alt 和 shift 同时按住时触发。
9. 编译器自动为以下事件类型启用事件委托（绑定在父元素上的基于冒泡的监听）：`beforeinput` `input` `change`；`keydown` `keypress` `keyup`；`click` `dblclick` `mousedown` `mousemove` `mouseup` `mouseover` `mouseout` `contextmenu`；`copy` `cut` `paste`；`drag` `dragstart` `dragenter` `dragover` `dragleave` `drop` `dragend`；`pointerdown` `pointermove` `pointerover` `pointerout` `pointerup` `pointercancel`；`select` `selectionchange` `selectstart`；`touchstart` `touchmove` `touchend` `touchcancel`。

## 约束

- 按键标志只能用于 `keyup`、`keydown` 等键盘相关事件。
- `self` 只控制处理器是否执行，绝不阻止事件触发。
- `stop` 与 `prevent` 在处理器末尾生效，不在处理器体之前。
- `passive` 是对"该处理器内绝不调用 preventDefault"的承诺。
- 事件名是关键字或保留字（`class`、`for`）时不能使用 `@click` 简写形式。

## 示例

方法引用；修改响应性变量自动更新视图：

```qk
<lang-js>
    let count = 0

    function handleAddCount(e) {
        count++ // 修改响应性变量，p 元素自动更新
        console.log(e.target === this) // logs: true
    }
</lang-js>

<p>current count: {count}</p>
<button @click={handleAddCount}>Add Count</button>
```

内联处理器使用 `$arg`，被调用方法内的 `this` 自动绑定：

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

标志：`self|once` 门槛与组合系统按键标志：

```qk
<lang-js>
    let clicks = 0
</lang-js>

<button @click|self|once={clicks++}>Click <span>Me</span></button>
<button @click|alt|shift={console.log("ok")}>Click Me</button>
```

## 参见

- [引用属性](docs://zh-cn/agent/basic/reference-attributes.md)
- [表单处理](docs://zh-cn/agent/basic/forms.md)
