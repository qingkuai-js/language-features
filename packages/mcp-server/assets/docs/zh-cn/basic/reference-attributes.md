# 引用属性

在 Qingkuai 中，引用属性是一种通过在属性名前添加 `&` 字符来传递变量引用的语法（如 `&value`）。它允许你在模板中将某个属性与外部变量建立引用关系，使该属性值可以被外部直接读写，从而实现灵活的数据联动和状态传递。

JavaScript 本身并不支持[引用传递](https://baike.baidu.com/item/引用传递)，但经编译器处理后，Qingkuai 的引用属性能模拟出类似 C、C++、Go 等语言中引用（指针）传递的效果，其本质是对 `setter` 的调用。借助引用属性，变量可以被显式“传址”到某个元素或组件中，使你能够在多个上下文之间共享和操作同一个状态源。这种机制简洁而强大，提升了模板中状态管理的表达力和控制力。下面这段伪代码可用于理解引用传递与值传递的区别：

```js
let num = 10

function passByValue(n) {
    // 在值传递中，n 是 num 的一个副本，
    // 它们在内存中是两个独立的位置，
    // 修改 n 不会影响原始的 num 值。
    n = n + 1
}

function passByReference(n) {
    // * 表示解引用操作符，它用于：
    // 读取指针 n 所指向的位置的值，
    // 加 1 后再将结果写回该位置。
    *n = *n + 1
}

passByValue(num)
console.log(num) // logs: 10

// & 表示取地址操作符，它用于：
// 取得 num 变量的内存地址，
// 并作为参数传给 passByReference。
passByReference(&num)
console.log(num) // logs: 11
```

---

## 获取 DOM 元素

当你需要获取模板中某个普通标签对应的 DOM 元素时，可以通过为该元素添加 `&handle` 属性来实现：

|js|ts|

```qk
<lang-js>
    let div = null

    onAfterMount(() => {
        console.log(div)
    })
</lang-js>

<div &handle={div}></div>
```

```qk
<lang-ts>
    let div!: HTMLDivElement | null = null

    onAfterMount(() => {
        console.log(div)
    })
</lang-ts>

<div &handle={div}></div>
```

> [!TIP]
> `onAfterMount` 是 Qingkuai 在组件完成挂载与渲染后触发的回调方法，它是 [组件生命周期](docs://zh-cn/components/lifecycle.md)的一部分。

> [!TIP]
> 如果你的嵌入脚本语言类型为 [TypeScript](https://www.typescriptlang.org/)，`&handle` 属性值是严格类型的。例如：对于 `div` 标签，它的类型是 [HTMLDivElement](https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLDivElement)；对于 `p` 元素，它的类型是 [HTMLParagraphElement](https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLParagraphElement)。当然，你也可以将接收者类型定义为元素的基类 [HTMLElement](https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLElement)。

当元素被销毁时，引用属性会自动将绑定的变量重置为 `null`，以避免悬空引用：

|js|ts|

```qk
<lang-js>
    import { nextTick } from "qingkuai"

    let div = null
    let show = true

    function handleDestroyDiv() {
        show = false
        nextTick(() => {
            console.log(div) // logs: null
        })
    }
</lang-js>
<div #if={show} &handle={div}></div>
<button @click={handleDestroyDiv}>Destroy Div</button>
```

```qk
<lang-ts>
    import { nextTick } from "qingkuai"

    let show = true
    let div: HTMLDivElement | null = null

    function handleDestroyDiv() {
        show = false
        nextTick(() => {
            console.log(div) // logs: null
        })
    }
</lang-ts>
<div #if={show} &handle={div}></div>
<button @click={handleDestroyDiv}>Destroy Div</button>
```

与动态属性一样，当引用属性和变量名称一致时可省略插值块，所以下面两种写法是等效的：

```qk
<div &handle></div>
<div &handle={handle}></div>
```

> [!WARNING]
> 若属性名称是嵌入脚本语言中的关键字或保留字，则不支持这种语法，如 `class` 或 `for` 属性等。

---

## 表单输入处理

在使用表单时，我们常常需要将输入框内容同步给嵌入脚本中的变量。通常情况下，我们可能需要在 `input` 元素中使用动态 `value` 属性，并监听用户输入来同步修改变量值：

|js|ts|

```qk
<lang-js>
    let inputValue = "Initial value"
</lang-js>

The inputValue is: {inputValue}

<div>
    <input
        type="text"
        !value={inputValue}
        @input={inputValue = $arg.target.value}
    />
</div>
```

```qk
<lang-ts>
    let inputValue = "Initial value"
</lang-ts>

The inputValue is: {inputValue}

<div>
    <input
        type="text"
        !value={inputValue}
        @input={inputValue = ($arg.target as HTMLInputElement).value}
    />
</div>
```

相较于上方示例中略显繁琐的做法，现在我们可以通过 `&value` 引用属性更简洁地实现这一需求：

```qk
<lang-js>
    let inputValue = "Initial value"
</lang-js>

The inputValue is: {inputValue}

<div>
    <input
        type="text"
        &value={inputValue}
    />
</div>
```

> [!TIP]
> 这里我们只是简单介绍了引用属性在处理表单输入时的用法，关于引用属性在表单中的更多使用细节我们将在 [表单处理](docs://zh-cn/basic/forms.md) 一节中介绍。

---

## 引用属性的合法值

与其他支持引用传递的语言类似，引用属性的值必须是 `可赋值`（其他语言中通常称为 `左值` 或 `可取址`）且非常量的目标。你可以将其大致理解为能出现在等号左侧的表达式：

```qk
<!-- 合法值 -->
<p &handle={identifier}></p>
<p &handle={arr[index]}></p>
<p &handle={obj.property}></p>

<!-- 非法值 -->
<p &handle={test()}></p>
<p &handle={arr?.[index]}></p>
<p &handle={obj?.property}></p>
<p &handle={condition ? v1: v2}></p>
```
