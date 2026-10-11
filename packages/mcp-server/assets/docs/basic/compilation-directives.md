# Compilation Directives

Directives are a core part of Qingkuai. They are special attributes prefixed with `#`, used to tell the compiler how to generate the corresponding JavaScript code. Qingkuai provides a feature-rich built-in directive system, covering flow control, rendering control, and asynchronous processing, among other aspects:

- Rendering control directives: `target`, `html` for controlling the insertion position and display of content;
- Flow control directives: `for`, `if`, `elif`, `else` for controlling structural rendering logic;
- Async processing directives: `await`, `then`, `catch` for reacting to changes in asynchronous data;

In addition, there is a `slot` directive for receiving component slot context. We will introduce it after covering the concepts of [components](docs://components/basic.md) and [slots](docs://components/slots.md).

---

## Conditional Rendering

In Qingkuai, conditional rendering logic is written by combining the `if`, `elif`, and `else` directives, which is very similar to the `if`, `else if`, and `else` keywords in JavaScript. Imagine such a scenario: when the user is not logged in, a login prompt is shown; after logging in, the user information is displayed. This is a very common requirement in front-end development, and with conditional rendering it can be easily implemented:

```qk
<qk:spread #if={!userInfo}>
    <p>
        Please log in first.
    </p>
     <button
         class="login-btn"
         @click={handleLogin}
     >
         Login
     </button>
</qk:spread>
<p #else>Hello {userInfo.name}!</p>
```

> [!TIP]
> The `qk:spread` tag used here is a virtual mounting point for directives; it will not be rendered to the page. You can understand it this way: the directives on this element are applied in turn to all of its child nodes. This design both avoids introducing meaningless extra elements and makes it possible for text nodes to use directives. We will cover more of its usages and details in [Built-in Elements](docs://misc/builtin-elements.md).

Of course, we can also insert some `elif` directives as branch nodes between `if` and `else`:

```qk
<p #if={language === "qk"}>Qingkuai</p>
<p #elif={language === "js"}>JavaScript</p>
<p #elif={language === "ts"}>TypeScript</p>
<p #else>Language is not Qingkuai, JavaScript, or TypeScript.</p>
```

---

## List Rendering

List rendering can be done very conveniently in Qingkuai. Below is the most basic usage example, which is often used during development and testing to quickly create list rendering:

```qk
<p #for={3}>Paragraph in list rendering.</p>
```

This will be rendered as three consecutive p tags:

```html
<p>Paragraph in list rendering.</p>
<p>Paragraph in list rendering.</p>
<p>Paragraph in list rendering.</p>
```

Of course, the value of the for directive can be not only a number, but also an array, object, string, [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set), [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map), or an expression that evaluates to one of these types. In addition, you can use `for...of`-like syntax to specify names for the item and index of each iteration.

```qk
<p #for={item, index of [1, 2, 3]}>{index}: {item}</p>
```

At this point, the rendered result is:

```html
<p>0: 1</p>
<p>1: 2</p>
<p>2: 3</p>
```

List rendering depending on a Map:

```qk
<lang-js>
    const languages = new Map([
        ["qk", "Qingkuai"],
        ["js", "JavaScript"],
        ["ts", "TypeScript"]
    ])
</lang-js>

<p #for={item, index of languages}>{index}: {item}</p>
```

At this point, the rendered result is:

```html
<p>qk: Qingkuai</p>
<p>js: JavaScript</p>
<p>ts: TypeScript</p>
```

When specifying names for the iteration items and indexes of the for directive, you can also use [destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring) syntax at the iteration item or index identifier position:

```qk
<lang-js>
    const languageInfos = {
        qk: {
            age: 1,
            name: "Qingkuai"
        },
        js: {
            age: 30,
            name: "JavaScript"
        },
        ts: {
            age: 13,
            name: "TypeScript"
        }
    }
</lang-js>

<p #for={{ name, age }, extension of languageInfos}>
    {name}: file extension is {extension}, released in {2025 - age}.
</p>
```

At this point, the rendered result is:

```html
<p>Qingkuai: file extension is qk, released in 2024.</p>
<p>JavaScript: file extension is js, released in 1995.</p>
<p>TypeScript: file extension is ts, released in 2012.</p>
```

If you have used [Vue](https://cn.vuejs.org), you may wonder why the `for` directive uses `of` as the iteration keyword instead of `in`. This is because the `in` keyword can appear in JavaScript expressions, while `of` cannot. For example, if `in` is used, the following case becomes hard to handle because it is ambiguous:

- `prop` is a context identifier, and what follows the `in` keyword is an expression
- the entire directive value is a JavaScript expression, and the `in` keyword is part of the expression

```qk
<p #for={prop in obj ? 3 : 2}>...</p>
```

---

## Key Directive

When we use the `for` directive to create list rendering and the list data changes, the framework needs to update the corresponding DOM elements. By default, the framework uses position matching to associate old and new elements: that is, elements are matched by list index. This works well when items are only added to or removed from the end of the list. But when items are inserted into, removed from, or reordered in the middle of the list, this causes problems, because a node's DOM state (such as form input values) will be incorrectly associated with other data items.

To solve this problem, you can use the `#key` directive to assign a unique identity to each element in the list, so the framework can accurately track each element by this key, ensuring that even when the list is reordered or items are inserted or deleted, an element's state correctly follows its corresponding data item. Therefore, if list-rendered elements carry state, it is recommended to add the `#key` directive:

```qk
<form>
    <input
        #for={user of users}
        #key={user.id}
        !value={user.name}
        placeholder="user name"
    />
</form>
```

> [!WARNING]
> At runtime, the value of the key directive is converted to a string, and the runtime checks whether duplicate values exist within the same list; when duplicated, a runtime error is thrown. Therefore, the key value of each item in the same list must remain unique.

---

## Async Processing

In some scenarios, you may need to asynchronously wait for a certain state in the embedded script and perform rendering only after the wait completes; in this case you can use the async processing directives. The await directive accepts a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) as its value, and after the Promise completes, you can render different content on success or failure via the then and catch directives respectively:

```qk
<p #await={pms}>waiting...</p>
<p #then>pms is resolved.</p>
<p #catch>pms is rejected.</p>
```

If you need to access the value returned by the Promise in the resolved or rejected state, simply set the value of the then or catch directive to a JavaScript identifier:

```qk
<p #await={pms}>waiting...</p>
<p #then={res}>pms is resolved and received {res}.</p>
<p #catch={err}>pms is rejected and received {err}.</p>
```

Of course, the context of the then and catch directives also supports [destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring) syntax:

```qk
<p #await={pms}>waiting...</p>
<p
    #then={
        {
            id: userId,
            name: userName
        }
    }
>
    pms is resolved and the user id is: {userId}, user name is: {userName}.
</p>
<p #catch={{msg, code}}>pms is rejected and the error code is: {code}, msg: {msg}.</p>
```

If you do not need to render any element while waiting, simply write the await directive and the then or catch directive on the same tag:

```qk
<p
    #await={pms}
    #then={res}
>
    pms is resolved with: {res}
</p>
```

> [!TIP]
> Qingkuai's [async components](docs://components/async-components.md) are also implemented based on combinations of the async processing directives.

---

## HTML Directive

Sometimes we need to render a piece of text as an HTML fragment, while regular interpolation blocks only modify textContent and escape the HTML content, so the expected effect cannot be achieved. In this case, you can use the html directive to meet this need:

```qk
<div class="dynamic-html-content" #html>{htmlStr}</div>
```

The outer element is not always required. To avoid introducing meaningless redundant elements, you can use the `qk:spread` [built-in element](docs://misc/builtin-elements.md) as a virtual mounting point for the directive:

```qk
<qk:spread #html>{htmlStr}</qk:spread>
```

In addition, we can pass a value to the html directive to describe which tags should remain escaped; this can effectively prevent [XSS](https://en.wikipedia.org/wiki/Cross-site_scripting) attacks when facing not fully trusted HTML fragments. The type of the html directive value is:

```ts
type HTMLDirectiveValueType = Partial<{
    escapeTags: string[] // List of tags that should remain escaped
    escapeStyle: boolean // Whether to keep style tags escaped
    escapeScript: boolean // Whether to keep script tags escaped
}>
```

We recommend handling not fully trusted content following the html directive usage example below:

```qk
<lang-js>
    // Same as the DESTRUCT_HTML constant exported from the qingkuai package
    const htmlDirectiveConf = {
        escapeStyle: true,
        escapeScript: true,
        escapeTags: ["link", "iframe", "form"]
    }
</lang-js>

<p #html={htmlDirectiveConf}>{htmlStr}</p>
```

> [!WARNING]
> If a tag uses the html directive, it can only contain one text child node; otherwise it will cause a fatal compiler error.

---

## Target Directive

In some scenarios, you may need to manually control the parent element into which an element is mounted, such as full-screen popups and the like; the target directive makes this easy to achieve. The value of the target directive is a CSS selector string or an [HTMLElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement). For example, both of the following two snippets mount the div onto the body element:

```qk
<div
    class="page-modal"
    #target={"body"}
></div>
```

```qk
<div
    class="page-modal"
    #target={document.body}
></div>
```

---

## Scope Directive

By default, the parent component's scope attribute is not passed down to any element of the child component, which guarantees the independence of component styles. However, in some scenarios you may want the parent component's styles to be able to override the child component's root element; in this case you can use the `#scope` directive. It can only be used on component tags, and attaches the parent component's scope attribute to the child component's root element:

```qk
<Child #scope />

<lang-css>
    /* Affects the child component's root element */
    .child-root {
        border-color: blue;
    }

    /* Affects elements inside the child component */
    [qk-scope] .child-box {
        background-color: lightblue;
    }
</lang-css>
```

> [!TIP]
> The content inside `lang-css` is an [embedded style block](docs://references/terminology.md#embedded-style-block) of a [component](docs://components/basic.md), used to define the component's style rules. If you do not yet understand the component scoped style mechanism, you can read [Stylesheets](docs://components/stylesheets.md) first and then come back to this section.

Note that when the child component's root node is a tag that does not create an actual DOM element, such as [qk:spread](docs://misc/builtin-elements.md#spread) or another component, Qingkuai continues inward to find the first physical element and attaches the scope attribute to it:

```qk
<!-- Parent.qk -->
<Middle #scope />

<lang-css>
    /* Affects the div in Child.qk */
    [qk-scope] {
        color: blue;
    }
</lang-css>
```

```qk
<!-- Middle.qk -->
<Child />
```

```qk
<!-- Child.qk -->
<div>...</div>
```

> [!TIP]
> Attaching the scope attribute only to the child component's **root element**, without affecting deeper levels, is to guarantee runtime performance.

In addition, multiple `#scope` directives can be combined along the ancestor chain; each layer attaches the current component's scope attribute to the final root element, achieving the stacking of styles from multiple ancestor layers. For example, in the example below, the `div` element in the `Child` component will ultimately have the scope attributes of both the `Parent` and `Middle` components, and is therefore affected by the style rules of both:

```qk
<!-- Parent.qk -->
<Middle #scope />
```

```qk
<!-- Middle.qk -->
<Child #scope />
```

```qk
<!-- Child.qk -->
<div>...</div>
```

---

## Directive Priority

When multiple directives exist on one element, the compiler processes them in a certain priority order to ensure correct rendering results. For example, when the `if` and `for` directives are used together on the same tag, the `if` directive is processed first to determine whether to render the element, and only if the condition is met will the `for` directive continue to be processed for list rendering:

```qk
<p
    #if={showList}
    #for={item of items}
>
    {item}
</p>
```

When you need to change this behavior, you need to wrap the inner tag with an outer tag that uses a higher-priority directive, for example:

```qk
<div #for={item of items}>
    <p #if={showList}>{item}</p>
</div>
```

The code above introduces a meaningless `div` element. To avoid this, you can use the `qk:spread` [built-in element](docs://misc/builtin-elements.md) as a virtual mounting point for the directives, avoiding the creation of redundant elements:

```qk
<qk:spread #for={item of items}>
    <p #if={showList}>{item}</p>
</qk:spread>
```

The default directive priority in Qingkuai, from high to low, is:

`slot` > `await/then/catch` > `if/elif/else` > `target` > `for/key` > `html`

> [!TIP]
> The priority of all other unlisted directives is lower than the `html` directive. When they appear together, their order determines their processing order (i.e., those appearing earlier are processed first).
