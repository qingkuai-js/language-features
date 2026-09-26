# 插值块

Qingkuai 的模板语法与 HTML 语法非常相似，甚至可以说它就是 HTML，但仍有一些细微区别：

- 模板语法中属性值未使用引号或花括号包裹时会导致编译器致命错误；
- 以 `!` 、 `@` 、 `#` 、 `&` 这四个字符开头的属性名称是特殊的，这些属性由编译器处理；
- 以大写字母开头或含有 `-` 或 `.` 字符的标签名会被认为是组件标签（嵌入语言标签除外）；
- 在模板文本或属性值中，可以使用花括号添加 `插值块` 来访问嵌入脚本语言中的值；

---

## 文本插值

要在模板中访问嵌入脚本语言的值，只需在文本处写一对花括号，并在其中编写 JS/TS 表达式即可：

```qk
<lang-js>
    let variable = "Qingkuai"
</lang-js>

<p>value of variable is: {variable}</p>
```

| 此时页面会显示：<u>value of variable is: Qingkuai</u>，并且当 `variable` 的值发生变化时，页面也会同步更新。

---

## 动态属性

然而，有些时候我们不只需要在文本处插值，还需要在属性值处插值。此时可以在普通属性名前添加英文感叹号 `!`，并将属性值用花括号包裹，以使用动态属性语法：

```qk
<div !id={dynamicId}></div>
```


当 `class` 作为动态属性时，还可以接受对象或数组作为值：当值为对象时，属性值为真值（truthy）的键名会被应用到 class 列表；当值为数组时，数组中的每一项都会被应用到 class 列表。也就是说，下面两种语法都允许：

```qk
<!-- 对象形式的动态 class 属性 -->
<div
    !class={
        {
            active,
            "dark-mode": isDarkMode
        }
    }
></div>

<!-- 数组形式的动态 class 属性 -->
<div !class={[a, b, c, d]}></div>
```

需要注意，模板语法中同一个标签不能同时拥有多个同名属性，即使一个是普通属性、一个是动态属性也不行。但 `class` 是个例外，它允许普通和动态 class 属性同时存在（两者均只能有一个），编译器会将两种 class 列表合并：

```qk
<!-- 编译器报错，属性名重复 -->
<div id="top-box" !id={dynamicId}></div>

<!-- 正常编译，但不能同时存在两个普通 class 属性或两个动态 class 属性 -->
<div class="container" !class={getDynamicClassList()}></div>
```

如果插值块中只需要填写一个与属性名同名的标识符，那么可以省略该插值块。也就是说，下面两种写法等效：

```qk
<div !id></div>
<div !id={id}></div>
```

> [!WARNING]
> 若属性名是嵌入脚本语言中的关键字或保留字，则不支持这种语法，例如 `class` 或 `for`。

---

## 合法的插值表达式

无论是文本插值、动态属性插值，还是稍后将介绍的[指令](docs://zh-cn/basic/compilation-directives.md)、[引用属性](docs://zh-cn/basic/reference-attributes.md)或[事件](docs://zh-cn/basic/event-handling.md)插值，都只能编写表达式，不允许使用语句。一个简单的判断方法是：看它能否出现在赋值语句的等号右侧。若不能，它很可能是一条语句，而不是表达式。下面代码中的每一行都是合法的插值表达式：

```qk
{a * b - 5}

{`Hello ${str}`}

{class MyClass{}}

{new Date()}

{() => {}}

{function anonymous(){}}

{condition ? value1 : value2}

{str.split("").reverse().join("")}
```

而下面代码中的每一行都是语句，不能出现在插值块中，否则会导致编译器致命错误：

```qk
{id;}

{try{}}

{return 10}

{const number = 10}

{if(condition){}}

{switch(value){}}

{for(const user of users){}}

{import {raw} from "qingkuai"}
```
