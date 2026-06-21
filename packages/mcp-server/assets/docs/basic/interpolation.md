# Interpolation Blocks

Qingkuai's template syntax is very similar to HTML syntax. In fact, you could almost say that it is HTML, but there are still some subtle differences:

- Attribute values in template syntax must be wrapped in quotes or curly braces, otherwise the compiler throws a fatal error.
- Attribute names starting with `!`, `@`, `#`, or `&` are special and are processed by the compiler.
- Tag names that start with an uppercase letter or contain `-` or `.` are treated as component tags, except for embedded language tags.
- In template text or attribute values, you can use curly braces to add an interpolation block and access values from the embedded script language.

---

## Text Interpolation

To access values from the embedded script language inside a template, simply write a pair of curly braces in text content and place a JS/TS expression inside them:

```qk
<lang-js>
    let variable = "Qingkuai"
</lang-js>

<p>value of variable is: {variable}</p>
```

The page then shows: <u>value of variable is: Qingkuai</u>, and when the value of `variable` changes, the page updates accordingly.

---

## Dynamic Attributes

Sometimes interpolation is needed not only in text, but also in attribute values. In that case, add an exclamation mark `!` before a normal attribute name and wrap the value in curly braces to use dynamic attribute syntax:

```qk
<div !id={dynamicId}></div>
```

<div class="custom-block tip">All interpolation blocks are reactive. When a reactive variable in the embedded script language changes, the corresponding DOM property is updated as well.</div>

<br />

When `class` is used as a dynamic attribute, it can also accept an object or an array as its value. If the value is an object, keys whose values are truthy are applied to the class list. If the value is an array, every item in the array is applied to the class list. In other words, both of the following forms are allowed:

```qk
<!-- Object form of dynamic class -->
<div
    !class={
        {
            active,
            "dark-mode": isDarkMode
        }
    }
></div>

<!-- Array form of dynamic class -->
<div !class={[a, b, c, d]}></div>
```

Note that in template syntax, the same tag cannot have multiple attributes with the same name, even if one is a normal attribute and the other is dynamic. `class` is the exception. It allows one normal class attribute and one dynamic class attribute to coexist, and the compiler merges the two class lists:

```qk
<!-- Compiler error: duplicate attribute name -->
<div id="top-box" !id={dynamicId}></div>

<!-- Compiles normally, but you still cannot have two normal class attributes or two dynamic class attributes -->
<div class="container" !class={getDynamicClassList()}></div>
```

If the interpolation block only needs a single identifier with the same name as the attribute, the interpolation block can be omitted. The following two forms are equivalent:

```qk
<div !id></div>
<div !id={id}></div>
```

<div class="custom-block warning">If the attribute name is a keyword or reserved word in the embedded script language, this syntax is not supported, such as <code>class</code> or <code>for</code>.</div>

---

## Valid Interpolation Expressions

Whether you are writing text interpolation, dynamic attribute interpolation, or interpolation for [directives](docs://basic/compilation-directives.md), [reference attributes](docs://basic/reference-attributes.md), or [events](docs://basic/event-handling.md), only expressions are allowed. Statements are not. A simple rule of thumb is to ask whether the code could appear on the right-hand side of an assignment. If not, it is probably a statement rather than an expression. Each line below is a valid interpolation expression:

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

Each line below is a statement, so it cannot appear inside an interpolation block. Otherwise, the compiler throws a fatal error:

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
