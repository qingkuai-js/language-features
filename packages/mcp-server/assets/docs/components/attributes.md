# Attributes

In Qingkuai, you can add attributes to component tags just as you do with normal HTML tags to pass parameters. This is called passing component attributes, and it is used to pass external data or configuration into a component. Through component attributes, a component can behave differently or be styled differently in different scenarios, which improves both reusability and flexibility.

---

## Static Attributes

Static attributes are passed to components as strings. Inside the component, external attribute values are accessed through the built-in `props` identifier:

|js|ts|

```qk
<!-- Inner.qk -->
<lang-js>
    /**
     * @typedef {Object} Meta
     * @property {Object} props
     * @property {string} props.msg
     */
    console.log(props.msg) // logs: value
</lang-js>
```

```qk
<!-- Inner.qk -->
<lang-ts>
    interface Meta {
        props: {
            msg: string
        }
    }
    console.log(props.msg) // logs: value
</lang-ts>
```

```qk
<!-- Outer.qk -->
<Inner msg="value" />
```

> [!TIP]
> The [JSDoc](https://jsdoc.app/) in the example above serves the same purpose as the `interface`: it declares types for `props` to provide attribute completion. See [TypeScript Support](docs://misc/typescript.md) for details.

If you add an attribute name to a component tag without giving it a value, the component receives the boolean value `true` internally:

|js|ts|

```qk
<!-- Inner.qk -->
<lang-js>
    /**
     * @typedef {Object} Meta
     * @property {Object} props
     * @property {boolean} [props.isOk]
     */
    console.log(props.isOk) // logs: true
</lang-js>
```

```qk
<!-- Inner.qk -->
<lang-ts>
    interface Meta {
        props: {
            isOk?: boolean
        }
    }
    console.log(props.isOk) // logs: true
</lang-ts>
```

```qk
<!-- Outer.qk -->
<Inner isOk />
```

---

## Dynamic Attributes

Dynamic attributes passed to a component are also accessed inside the component through the built-in `props` identifier, but dynamic attributes support passing more data types, not just strings. When the data source changes, the DOM elements inside the component that use the attribute are updated:

|js|ts|

```qk
<!-- Inner.qk -->
<lang-ts>
    /**
     * @typedef {Object} Meta
     * @property {Object} props
     * @property {string[]} props.list
     */
</lang-ts>

<p>The length of list is: {props.list.length}</p>
```

```qk
<!-- Inner.qk -->
<lang-ts>
    interface Meta {
        props: {
            list: string[]
        }
    }
</lang-ts>

<p>The length of list is: {props.list.length}</p>
```

```qk
<!-- Outer.qk -->
<lang-ts>
    const list = ["js", "ts", "qk"]
    setTimeout(list.pop, 1000)
</lang-ts>

<Inner !list />
```

---

## Events

Like other non-reference attributes, component events are accessed inside the component through the built-in `props` identifier:

|js|ts|

```qk
<!-- Inner.qk -->
<lang-js>
    /**
     * @typedef {Object} Meta
     * @property {Object} props
     * @property {(msg: string) => void} props.someThingHappened
     */
    setTimeout(() => {
        props.someThingHappened("event is triggered.")
        // logs: event is triggered.
    }, 1000)
</lang-js>
```

```qk
<!-- Inner.qk -->
<lang-ts>
    interface Meta {
        props: {
            someThingHappened: (msg: string) => void
        }
    }
    setTimeout(() => {
        props.someThingHappened("event is triggered.")
        // logs: event is triggered.
    }, 1000)
</lang-ts>
```

```qk
<!-- Outer.qk -->
<Inner @someThingHappened={console.log($arg)} />
```

> [!TIP]
> In terms of passing and usage, component events are no different from other non-reference attributes. The only difference is semantic: component events usually represent actions or state changes that happen inside the component, while component attributes are more often used as component configuration or data input. Therefore, when designing a component interface, we recommend naming callback functions passed into components as events and marking them with the `@` prefix, so their purpose and semantics are clearer.

> [!TIP]
> When Qingkuai's language server provides completion suggestions, only attributes whose values are function types are suggested as events.

---

## Reference Attributes

Reference attributes are an important capability in components because they allow a component to modify values passed in from outside. Since the properties on the `props` object are essentially read-only getters, they cannot be modified directly. In that case, the reference-passing mechanism provided by reference attributes is required. Qingkuai provides the built-in `refs` identifier inside component files for accessing externally passed reference attributes. By modifying properties on `refs`, you can synchronize changes back to external data and trigger its reactive updates. Here is a simple example:

|js|ts|

```qk
<!-- Inner.qk -->
<lang-js>
    /**
     * @typedef {Object} Meta
     * @property {Object} refs
     * @property {string} refs.name
     */
</lang-js>

<p>Inner name: {refs.name}</p>
<button @click={refs.name = "Qingkuai"}>Change the name</button>
```

```qk
<!-- Inner.qk -->
<lang-ts>
    interface Meta {
        refs: {
            name: string
        }
    }
</lang-ts>

<p>Inner name: {refs.name}</p>
<button @click={refs.name = "Qingkuai"}>Change the name</button>
```

```qk
<!-- Outer.qk -->
<lang-js>
    import Inner from "./Inner.qk"

    let name = "JavaScript"
</lang-js>

<p>Outer name: {name}</p>
<Inner &name={name} />
```

Before clicking the "Change the name" button, the rendered output is:

```html
<p>Outer name: JavaScript</p>
<p>Inner name: JavaScript</p>
<button>Change the name</button>
```

After the button is clicked, the rendered output changes to:

```html
<p>Outer name: Qingkuai</p>
<p>Inner name: Qingkuai</p>
<button>Change the name</button>
```

> [!WARNING]
> If a value inside `props` is itself a complex type such as an object or array, its internal data can still be modified technically. For example, when `props.userInfo` is an object, `props.userInfo.name` can still be reassigned. However, this is not recommended, because it makes component state harder to track and maintain.

Note that `&handle` on a component tag is a special reference attribute used to get the component instance, so when naming reference attributes, avoid using `handle` as the name:

|js|ts|

```qk
<lang-js>
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

    let child: ComponentInstance<typeof Child> | null = null

    onAfterMount(() => {
        // Inspect component state or access component exports through Child
    })
</lang-ts>

<Child &handle={child} />
```

> [!TIP]
> `onAfterMount` is a built-in [lifecycle](docs://components/lifecycle.md) callback registration method in component files.

> [!TIP]
> Like [getting DOM nodes through `&handle`](docs://basic/reference-attributes.md#getting-dom-elements), when a component is destroyed, reference attributes automatically reset the bound variable to `null`, effectively preventing memory leaks caused by dangling references.

---

## Reactive Destructuring

When destructuring the built-in `props` or `refs` objects, the destructuring statement itself triggers a `getter` call on the corresponding property, but the resulting identifiers are just independent plain variables — subsequent reads and writes no longer go through the `getter`, so they lose their connection to the externally passed attribute value. The exact behavior depends on the value type:

- **Primitive types** (such as strings, numbers): the destructured identifier may be inferred as having its own reactivity, and views inside the component that depend on it will update accordingly; however, it has lost its connection to the externally passed attribute value, so external content that depends on that attribute will not update:

    ```qk
    <!-- Inner.qk -->
    <lang-js>
        let { name } = refs

        // Outer view does not update; Inner view updates
        name = "Qingkuai"
    </lang-js>

    <p>Inner name: {name}</p>
    ```

    ```qk
    <!-- Outer.qk -->
    <lang-js>
        let name = "JavaScript"
    </lang-js>

    <Inner &name={name} />
    <p>Outer name: {name}</p>
    ```

- **Complex types** (such as objects, arrays): when the attribute value itself is a reactive object, the destructured identifier still points to that object, and accessing its properties remains reactive; however, reassigning the identifier itself behaves the same as primitive types — it only updates the local view and does not sync back to the externally passed value:

    ```qk
    <!-- Inner.qk -->
    <lang-js>
        let { userInfo } = refs

        // Both Outer and Inner views update
        userInfo.name = "Qingkuai"

        // Outer view does not update; Inner view updates
        userInfo = { name: "Qingkuai" }
    </lang-js>

    <p>Inner user name: {userInfo.name}</p>
    ```

    ```qk
    <!-- Outer.qk -->
    <lang-js>
        let userInfo = {
            name: "JavaScript"
        }
    </lang-js>

    <Inner &userInfo={userInfo} />
    <p>Outer user name: {userInfo.name}</p>
    ```

> [!TIP]
> The destructuring behavior above is consistent with how destructuring plain objects works in standard JavaScript. Qingkuai follows this semantics to avoid conceptual confusion.

If the goal is to destructure component attributes reactively, it is recommended to always pair destructuring with the built-in `alias` method — this is a good habit. This explicit marking approach eliminates ambiguity, makes code intent immediately clear, and facilitates code review and maintenance in team collaboration:

```js
// Accessing or writing name is reactive
let { name } = alias(refs)

// Accessing userInfo is reactive
const { userInfo } = alias(props)
```

> [!TIP]
> After compiler processing, the alias identifiers created by `alias` are fully transformed into access expressions for the original properties, with no additional wrapper overhead at runtime. For more details, see [Reactive Aliases](docs://basic/reactivity.md#reactive-aliases).

---

## Specifying Default Values

Component attributes support default values. When a parent component does not pass a certain attribute, the component can specify a default value internally to ensure that it still works correctly. Through the built-in `defaults` method, you can declare default values for component attributes:

|js|ts|

```js
/**
 * @typedef {Object} Meta
 * @property {Object} refs
 * @property {boolean} [refs.checked]
 *
 * @property {Object} props
 * @property {number} [props.age]
 * @property {string} [props.name]
 * @property {string} props.description
 */
defaults({
    refs: {
        checked: false
    },
    props: {
        age: 0,
        name: "Unknown"
    }
})
```

```ts
interface Meta {
    refs: {
        checked?: boolean
    }
    props: {
        age?: number
        name?: string
        description: string
    }
}
defaults({
    refs: {
        checked: false
    },
    props: {
        age: 0,
        name: "Unknown"
    }
})
```

> [!TIP]
> After `defaults` is called, keys that have been given default values are narrowed to non-optional in subsequent code. See [Default Value Inference](docs://misc/typescript.md#default-value-inference) for details.

---

## Attribute Name Format

Just like component names, Qingkuai component attribute names support both kebab-case and camelCase. The following two forms are equivalent:

```qk
<Component myAttr />
<Component my-attr />
```

By default, formatting a component file rewrites all kebab-case component attribute and event names into camelCase. However, you can add a `.prettierrc` file in the component file's directory or one of its parent directories and use the following content to change the preferred format to kebab-case:

```json
{
    "qingkuai": {
        "componentAttributeFormatPreference": "kebab"
    }
}
```

> [!TIP]
> With this configuration enabled, the Qingkuai language server also prefers kebab-case names in component attribute completion suggestions.
