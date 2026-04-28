---
description: "Qingkuai reactivity system: automatic inference, reactive modes, aliases, derived state, watchers, and reactive stores."
---

# Scope

Reactivity declaration and management; reactive variables, derived state, watchers, and reactive state stores.

# Reactivity Declaration

Compiler automatically attaches reactive capability to top-level identifiers based on access patterns. No manual declarations needed by default.

```qk
<lang-js>
    let progress = "pending"
    setTimeout(() => { progress = "completed" }, 1000)
</lang-js>
<h1>Status: {progress}</h1>  <!-- auto-updates -->
```

## Preventing Reactivity

```js
let progress = raw("pending") // no reactivity
```

## Explicit Reactivity

```js
let reactive_var = reactive("pending") // deep reactivity
let shallow_var = shallow("pending") // shallow only
```

# Reactivity Modes

## Deep Reactivity (default)

Nested properties become reactive recursively.

Configuration in `.qingkuairc`:

```json
{ "reactivityMode": "deep" }
```

## Shallow Reactivity

Only the identifier itself is reactive; complex properties are not.

Configuration in `.qingkuairc`:

```json
{ "reactivityMode": "shallow" }
```

Override per file:

```qk
<lang-js shallow>
    // shallow reactivity
</lang-js>

<lang-js reactive>
    // deep reactivity
</lang-js>
```

# Reactive Aliases

```js
let name = alias(refs.userInfo.detail.information.name)
// Reading/writing name is reactive and equivalent to the original path
```

Behavior: `alias` shortens deep access paths while preserving source reactivity.

Constraint: Alias values must be addressable (valid on left side of assignment).

# Derived Reactive State

## Shorthand Declaration

```js
let $double = number * 2 // derived from number
const $result = () => number * 2 // function form for complex logic
```

## Explicit Declaration

```js
const double = derived(() => number * 2)
const double = derivedExp(number * 2) // expressions only
```

Disable shorthand in `.qingkuairc`:

```json
{ "convenientDerivedDeclaration": false }
```

# Getting Raw/Reactive Values

```js
import { toRaw, toReactive, toShallowReactive } from "qingkuai"

const raw_obj = toRaw(reactive_obj) // get raw value
const reactive_obj = toReactive(obj) // get reactive proxy
const shallow_obj = toShallowReactive(obj) // get shallow proxy
```

Warning: `toReactive` does not add reactivity; it only returns the proxy if the value is already reactive.

# Reactive State Store

```js
// store.js
import { createStore } from "qingkuai"
export const store = createStore({
    isLogin: false,
    userInfo: null
})
```

Share across components by importing the same store instance.

# Destructuring Reactive Declarations

```js
const { code, msg } = obj // auto-reactive if obj is reactive
const [start, end] = range // auto-reactive if range is reactive
const { code, msg } = reactive(obj) // explicit
const { code, msg } = alias(refs.response) // with alias
```

Constraint: Shorthand derived declarations do NOT support destructuring:

```js
const { $code } = obj // NOT supported
```
