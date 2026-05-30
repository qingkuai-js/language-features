---
description: ""
---

# Compilation Directives

Directives are a core part of Qingkuai. They are special attributes prefixed with `#`, used to tell the compiler how to generate corresponding JavaScript code. Qingkuai provides a rich built-in directive system that covers flow control, rendering control, and asynchronous processing:

- Rendering control directives: `target`, `html` for controlling insertion targets and visibility;
- Flow control directives: `for`, `if`, `elif`, `else` for structural rendering logic;
- Async directives: `await`, `then`, `catch` for reacting to asynchronous state;

In addition, there is a `slot` directive for receiving slot context in components. We will introduce it after covering the concepts of [components](docs://components/basic.md) and [slots](docs://components/slots.md).

---

## Conditional Rendering

In Qingkuai, you can combine `if`, `elif`, and `else` to implement conditional rendering, which is similar to JavaScript's `if`, `else if`, and `else`. Consider this common scenario: show a login prompt before the user logs in, and show user information after login:

```qk
<qk:spread #if={!userInfo}>
    <p>Please log in first.</p>
    <button
        class="login-btn"
        @click={handleLogin}
    >
        Login
    </button>
</qk:spread>
<p #else>Hello {userInfo.name}!</p>
```

<div class="custom-block tip">
    The <code>qk:spread</code> tag above acts as a virtual mounting point for directives. It is not rendered to the page. You can treat it as a container whose directives are applied to all child nodes. This design avoids unnecessary wrapper elements and also makes it possible to apply directives to text nodes. More details are covered in <a href="docs://misc/builtin-elements.md">Built-in Elements</a>.
</div>

You can also insert `elif` branches between `if` and `else`:

```qk
<p #if={language === "qk"}>Qingkuai</p>
<p #elif={language === "js"}>JavaScript</p>
<p #elif={language === "ts"}>TypeScript</p>
<p #else>Language is not Qingkuai, JavaScript, or TypeScript.</p>
```

---

## List Rendering

Qingkuai makes list rendering straightforward. Here is a basic example often used in quick testing:

```qk
<p #for={3}>Paragraph in list rendering.</p>
```

This will render three consecutive p tags:

```html
<p>Paragraph in list rendering.</p>
<p>Paragraph in list rendering.</p>
<p>Paragraph in list rendering.</p>
```

The value of `for` can be not only a number, but also an array, object, string, [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set), [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map), or an expression that evaluates to one of these. You can also use `for...of`-like syntax to name each iteration item and index.

```qk
<p #for={item, index of [1, 2, 3]}>{index}: {item}</p>
```

The rendered result will be:

```html
<p>0: 1</p>
<p>1: 2</p>
<p>2: 3</p>
```

List rendering with Map:

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

The rendered result will be:

```html
<p>qk: Qingkuai</p>
<p>js: JavaScript</p>
<p>ts: TypeScript</p>
```

When naming for directive iteration items and indexes, you can also use [destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring) syntax at the item or index identifier name:

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

The rendered result will be:

```html
<p>Qingkuai: file extension is qk, released in 2024.</p>
<p>JavaScript: file extension is js, released in 1995.</p>
<p>TypeScript: file extension is ts, released in 2012.</p>
```

If you have used [Vue](https://cn.vuejs.org), you may wonder why Qingkuai uses `of` instead of `in` in the `for` directive. The reason is that `in` can appear in JavaScript expressions, while `of` cannot. Using `in` would introduce ambiguity:

- `prop` could be interpreted as a context identifier, with the expression after `in` as the data source;
- Or the entire directive value could be interpreted as one JavaScript expression that contains `in`.

```qk
<p #for={prop in obj ? 3 : 2}>...</p>
```

---

## key Directive

When a list rendered by `for` changes, the framework updates the corresponding DOM nodes. By default, it matches old and new nodes by position (index). This works well when items are only appended to or removed from the end. But when items are inserted, removed, or reordered in the middle, node-local DOM state (such as form input values) may be associated with the wrong data item.

To solve this, use `#key` to provide a unique identity for each rendered node. The framework can then track nodes by key so that state stays with the correct data item even when the list is reordered, inserted, or deleted. Therefore, when list-rendered elements have local state, adding `#key` is strongly recommended:

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

<div class="custom-block warning">
    At runtime, key values are converted to strings and checked for duplicates within the same list. Duplicate keys cause a runtime error. Each item's key must be unique within that list.
</div>

---

## Async Processing

In some cases, you may need to wait for asynchronous state in embedded scripts and render only after it is resolved. Qingkuai provides async directives for this. The `await` directive accepts a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise). After the promise settles, `then` and `catch` can render different content for success and failure:

```qk
<p #await={pms}>waiting...</p>
<p #then>pms is resolved.</p>
<p #catch>pms is rejected.</p>
```

To access resolved/rejected values, set the `then`/`catch` directive value to a JavaScript identifier:

```qk
<p #await={pms}>waiting...</p>
<p #then={res}>pms is resolved and received {res}.</p>
<p #catch={err}>pms is rejected and received {err}.</p>
```

`then`/`catch` context also supports [destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring):

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
    pms is resolved and the user id is {userId}, user name is {userName}.
</p>
<p #catch={{msg, code}}>pms is rejected and the error code is {code}, msg: {msg}.</p>
```

If you do not need intermediate UI during waiting, place `await` and `then`/`catch` on the same tag:

```qk
<p
    #await={pms}
    #then={res}
>
    pms is resolved with: {res}
</p>
```

<div class="custom-block tip">
    Qingkuai <a href="docs://components/async-components.md">async components</a> are also implemented by combining these async directives.
</div>

---

## html Directive

Sometimes you need to render text as an HTML fragment. Regular interpolation only updates `textContent` and escapes HTML, so it cannot achieve that behavior. In this case, use the `html` directive:

```qk
<div class="dynamic-html-content" #html>{htmlStr}</div>
```

The wrapper element in the example above is not always necessary. To avoid extra meaningless elements, use the `qk:spread` built-in element as a virtual mounting point:

```qk
<qk:spread #html>{htmlStr}</qk:spread>
```

You can also pass a config object to `html` to define which tags should stay escaped. This helps prevent [XSS](https://en.wikipedia.org/wiki/Cross-site_scripting) when handling partially trusted HTML. The `html` directive value type is:

```ts
type HTMLDirectiveValueType = Partial<{
    escapeTags: string[] // List of tags that should remain escaped
    escapeStyle: boolean // Whether to keep escaping for style tags
    escapeScript: boolean // Whether to keep escaping for script tags
}>
```

For partially trusted content, this usage is recommended:

```qk
<lang-js>
    // Equivalent to the DESTRUCT_HTML constant exported from the qingkuai package
    const htmlDirectiveConf = {
        escapeStyle: true,
        escapeScript: true,
        escapeTags: ["link", "iframe", "form"]
    }
</lang-js>

<p #html={htmlDirectiveConf}>{htmlStr}</p>
```

<div class="custom-block warning">
    A tag using the `html` directive can only contain one text child node. Otherwise, the compiler throws a fatal error.
</div>

---

## target Directive

In some scenarios, you may need to manually control the parent element where a node is mounted, such as full-screen modals. The `target` directive supports this. Its value can be a CSS selector string or an [HTMLElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement). The following examples both mount the `div` into `body`:

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

## Directive Priority

When multiple directives appear on the same element, the compiler processes them in a fixed priority order to ensure correct rendering. For example, if `if` and `for` are used together on the same tag, `if` is processed first to determine whether the element should render, and `for` runs only when that condition passes:

```qk
<p
    #if={showList}
    #for={item of items}
>
    {item}
</p>
```

If you need different behavior, wrap the inner tag with an outer tag that uses a higher-priority directive, for example:

```qk
<div #for={item of items}>
    <p #if={showList}>{item}</p>
</div>
```

The code above introduces a meaningless `div` element. To avoid that, you can use the `qk:spread` [built-in element](docs://misc/builtin-elements.md) as a virtual mounting point for directives, so no extra wrapper element is created:

```qk
<qk:spread #for={item of items}>
    <p #if={showList}>{item}</p>
</qk:spread>
```

The default directive priority in Qingkuai, from high to low, is:

`slot` > `await/then/catch` > `if/elif/else` > `target` > `for/key` > `html`

<div class="custom-block tip">
    Any directives not listed above have the same priority as <code>html</code>, which is the lowest. When priorities are equal, processing order follows their appearance order in the tag.
</div>
