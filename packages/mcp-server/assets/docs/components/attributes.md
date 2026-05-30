---
description: ""
---

# Attributes

In Qingkuai, you can add attributes to component tags just as you do with normal HTML tags to pass parameters. This is called passing component attributes, and it is used to pass external data or configuration into a component. Through component attributes, a component can behave differently or present itself differently in different scenarios, which improves both reusability and flexibility.

---

## Static Attributes

Static attributes are passed to components as strings. Inside the component, external attribute values are accessed through the built-in `props` identifier:

|js|ts|

```qk
<!-- Outer.qk -->
<Inner attr="value" >

<!-- Inner.qk -->
<lang-js>
    console.log(props.attr) // logs: value
</lang-js>
```

```qk
<!-- Outer.qk -->
<Inner attr="value" >

<!-- Inner.qk -->
<lang-ts>
    interface Props {
        attr: string
    }
    console.log(props.attr) // logs: value
</lang-ts>
```

<div class="custom-block tip">
    If your embedded script language is TypeScript, or if you want component attribute completion suggestions, it is recommended to read <a href="docs://misc/typescript.md">TypeScript Support</a> before continuing with this section.
</div>

If you add an attribute name to a component tag without giving it a value, the component receives the boolean value `true` internally:

|js|ts|

```qk
<!-- Outer.qk -->
<Inner attr />

<!-- Inner.qk -->
<lang-js>
    console.log(props.attr) // logs: true
</lang-js>
```

```qk
<!-- Outer.qk -->
<Inner attr />

<!-- Inner.qk -->
<lang-ts>
    interface Props {
        attr?: boolean
    }
    console.log(props.attr) // logs: true
</lang-ts>
```

---

## Dynamic Attributes

Dynamic attributes passed to a component are also accessed through the built-in `props` identifier. Unlike static attributes, however, dynamic attributes can pass more than just strings. They can pass booleans, objects, and other kinds of data. When the data source changes, DOM elements inside the component that use that attribute are updated accordingly:

|js|ts|

```qk
<!-- Outer.qk -->
<lang-js>
    const list = ["js", "ts", "qk"]
    setTimeout(list.pop, 1000)
</lang-js>

<Inner !list />

<!-- Inner.qk -->
<p>The length of list is: {props.list.length}</p>
```

```qk
<!-- Outer.qk -->
<lang-ts>
    const list = ["js", "ts", "qk"]
    setTimeout(list.pop, 1000)
</lang-ts>

<Inner !list />

<!-- Inner.qk -->
<lang-ts>
    interface Props {
        list: string[]
    }
</lang-ts>

<p>The length of list is: {props.list.length}</p>
```

---

## Events

Like other non-reference attributes, component events are accessed inside the component through the built-in `props` identifier:

|js|ts|

```qk
<!-- Outer.qk -->
<Inner @someThingHappened={console.log($arg)} />

<!-- Inner.qk -->
<lang-js>
    setTimeout(() => {
        props.someThingHappened("event is triggered.")
        // logs: event is triggered.
    }, 1000)
</lang-js>
```

```qk
<!-- Outer.qk -->
<Inner @someThingHappened={console.log($arg)} />

<!-- Inner.qk -->
<lang-ts>
    interface Props {
        someThingHappened: (msg: string) => void
    }
    setTimeout(() => {
        props.someThingHappened("event is triggered.")
        // logs: event is triggered.
    }, 1000)
</lang-ts>
```

<div class="custom-block tip">
    In terms of passing and usage, component events are no different from other non-reference attributes. The only difference is semantic: component events usually represent actions or state changes that happen inside the component, while component attributes are more often used as component configuration or data input. Therefore, when designing a component interface, we recommend naming callback values passed into components as events and marking them with the `@` prefix, so their purpose and semantics are clearer.
</div>
<div class="custom-block tip">
    When Qingkuai's language server provides completion suggestions, only attributes whose values are function types are suggested as events.
</div>

---

## Reference Attributes

Reference attributes are an important capability in components because they allow a component to modify values passed in from outside. Since the properties on the `props` object are essentially read-only getters, they cannot be modified directly. In that case, the reference-passing mechanism provided by reference attributes is required. Qingkuai provides the built-in `refs` identifier inside component files for accessing externally passed reference attributes. By modifying properties on `refs`, you can synchronize changes back to external data and trigger its reactive updates. Here is a simple example:

|js|ts|

```qk
<!-- Outer.qk -->
<lang-js>
    import Inner from "./Inner.qk"

    let name = "JavaScript"
</lang-js>

<p>name is: {name}</p>
<Inner &attr={name} />

<!-- Inner.qk -->
<p>refs.attr is: {refs.attr}</p>
<button @click={refs.attr = "Qingkuai"}>Change refs.attr</button>
```

```qk
<!-- Outer.qk -->
<lang-ts>
    import Inner from "./Inner.qk"

    let name = "JavaScript"
</lang-ts>

<p>name is: {name}</p>
<Inner &attr={name} />

<!-- Inner.qk -->
<lang-ts>
    interface Refs {
        attr: string
    }
</lang-ts>

<p>refs.attr is: {refs.attr}</p>
<button @click={refs.attr = "Qingkuai"}>Change refs.attr</button>
```

<div class="custom-block warning">
    If a value inside <code>props</code> is itself a complex type such as an object or array, its internal data can still be modified technically. For example, when <code>props.userInfo</code> is an object, <code>props.userInfo.name</code> can still be reassigned. However, this is not recommended, because it makes component state harder to track and maintain.
</div>

Note that `&handle` on a component tag is a special reference attribute used to get the component instance, so when naming reference attributes, avoid using `handle` as the name:

|js|ts|

```qk
<lang-js>
    import { onAfterMount } from "qingkuai"

    let child = null

    onAfterMount(() => {
        // Inspect component state or access component exports through Child
    })
</lang-js>

<Child &handle={child} />
```

```qk
<lang-ts>
    import type { ComponentInstance } from "qingkuai"

    import Child from "./Child.qk"
    import { onAfterMount } from "qingkuai"

    let child: ComponentInstance<typeof Child> | null = null

    onAfterMount(() => {
        // Inspect component state or access component exports through Child
    })
</lang-ts>

<Child &handle={child} />
```

<div class="custom-block tip">Like <a href="docs://basic/reference-attributes.md#获取-dom-元素">getting DOM nodes through `&handle`</a>, when a component is destroyed, reference attributes automatically reset the bound variable to `null` to avoid dangling references.</div>

---

## Attribute Destructuring

Values obtained by destructuring the built-in `props` or `refs` objects directly do not have reactive capability themselves. In the following example, access to `str` is not reactive, because this does not trigger the getter on the `props` property access:

```js
const { str } = props
```

If you need to destructure component attributes while preserving reactivity, use the compiler built-in `alias` together with destructuring:

```js
const { str } = alias(props)

// Accessing str is reactive and equivalent to accessing props.str
```

Likewise, values obtained by destructuring the built-in `refs` object with `alias` are also reactive:

```js
let { str } = alias(refs)

// Accessing or writing str is reactive and equivalent to accessing or writing refs.str
```

---

## Specifying Default Values

Component attributes support default values. When a parent component does not pass a certain attribute, the component can specify a default value internally to ensure that it still works correctly. Through the compiler built-ins `defaultProps` and `defaultRefs`, you can declare default values for component attributes:

```js
defaultRefs({
    checked: false
})

defaultProps({
    age: 0,
    name: "Unknown",
    description: "This is a default user info."
})
```

---

## Attribute Name Format

Just like component names, Qingkuai component attribute names support both kebab-case and camelCase. The following two forms are equivalent:

```qk
<Component myAttr />
<Component my-attr />
```

By default, formatting a component file rewrites kebab-case component attribute and event names into camelCase. However, you can add a `.prettierrc` file in the component file's directory or one of its parent directories and use the following content to change the preferred format to kebab-case:

```json
{
    "qingkuai": {
        "componentAttributeFormatPreference": "kebab"
    }
}
```

<div class="custom-block tip">
    With this configuration enabled, the Qingkuai language server also prefers kebab-case names in component attribute completion suggestions.
</div>
