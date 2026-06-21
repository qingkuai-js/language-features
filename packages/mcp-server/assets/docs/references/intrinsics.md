# Compiler Intrinsics

Compiler intrinsics are reserved identifiers that do not need to be declared inside component files and can be recognized and handled directly by the compiler. They are mainly used to access component attributes, reference attributes, and slot state, as well as to call built-in methods provided by the compiler.

---

## props

`props` is used to read normal attributes and event attributes passed in from outside the component. Through it, a component can access data and event handlers passed by its parent, enabling communication and data flow between components.

See: [Attributes](docs://components/attributes.md)

---

## refs

`refs` is used to access reference attributes inside a component and perform writable updates. Through it, a component can obtain reference data passed in by its parent and modify that data directly to implement two-way binding or other interaction patterns.

See: [Attributes](docs://components/attributes.md#reference-attributes), [Reference Attributes](docs://basic/reference-attributes.md)

---

## slots

`slots` is used to determine whether slot content has been passed into a component. Through it, a component can adjust its rendering logic based on whether the parent provides slot content.

See: [Slots](docs://components/slots.md)

---

## reactive

`reactive` is a built-in method used to explicitly mark an identifier as having deep reactivity. How the compiler handles that identifier depends on how it is declared: when declared with `let` or `var`, both the identifier itself and all of its nested properties are inferred as reactive; when declared with `const`, the identifier itself cannot be reassigned, so only its properties are recursively inferred as reactive.

See: [Reactivity Declaration](docs://basic/reactivity.md#reactivity-declaration), [Reactive Depth](docs://basic/reactivity.md#reactive-depth), [Reactivity Inference Rules](docs://references/reactivity-infer-rules.md)

---

## shallow

`shallow` is a built-in method used to explicitly mark an identifier as having shallow reactivity. How the compiler handles that identifier depends on how it is declared: when declared with `let` or `var`, only the identifier itself is inferred as reactive and its properties do not participate in reactive inference; when declared with `const`, only its first-level properties are inferred as reactive, and deeper properties are not.

See: [Reactivity Declaration](docs://basic/reactivity.md#reactivity-declaration), [Reactive Depth](docs://basic/reactivity.md#reactive-depth), [Reactivity Inference Rules](docs://references/reactivity-infer-rules.md)

---

## raw

`raw` is a built-in method used to explicitly mark an identifier as a static value. An identifier marked with `raw` will not be given reactive behavior by the compiler, so modifying it will not trigger page updates.

See: [Reactivity Declaration](docs://basic/reactivity.md#reactivity-declaration), [Reactivity Inference Rules](docs://references/reactivity-infer-rules.md)

---

## alias

`alias` is a built-in method used to create an alias for an identifier. Through `alias`, developers can simplify complex access or write operations into more direct expressions while preserving reactivity.

See: [Reactive Aliases](docs://basic/reactivity.md#reactive-aliases), [Destructure Built-in Objects](docs://components/attributes.md#destructure-built-in-objects)

---

## derived

`derived` is a built-in method used to create derived reactive state. Through `derived`, developers can define new reactive state based on existing reactive state. These derived values automatically track dependencies and update when those dependencies change.

See: [Derived Reactive State](docs://basic/reactivity.md#derived-reactive-state)

---

## derivedExp

`derivedExp` is a built-in method used to create a shorthand declaration for derived reactive state. Through `derivedExp`, developers can pass an expression directly to define derived state, and the compiler automatically converts it into a standard `derived` declaration.

See: [Derived Reactive State](docs://basic/reactivity.md#derived-reactive-state)

---

## watchExp

`watchExp` is a built-in method used to create a shorthand registration for a watcher. Through `watchExp`, developers can pass an expression directly to define watcher dependencies, and the compiler automatically converts it into a standard `watch` registration.

See: [Watchers](docs://basic/watchers-and-side-effects.md#watchers), [Convenience Registration](docs://basic/watchers-and-side-effects.md#convenience-registration)

---

## preWatchExp

`preWatchExp` is a built-in method used to create a shorthand registration for a pre-watcher. Through `preWatchExp`, developers can pass an expression directly to define pre-watcher dependencies, and the compiler automatically converts it into a standard `preWatch` registration.

See: [Watchers](docs://basic/watchers-and-side-effects.md#watchers), [Convenience Registration](docs://basic/watchers-and-side-effects.md#convenience-registration)

---

## postWatchExp

`postWatchExp` is a built-in method used to create a shorthand registration for a post-watcher. Through `postWatchExp`, developers can pass an expression directly to define post-watcher dependencies, and the compiler automatically converts it into a standard `postWatch` registration.

See: [Watchers](docs://basic/watchers-and-side-effects.md#watchers), [Convenience Registration](docs://basic/watchers-and-side-effects.md#convenience-registration)

---

## syncWatchExp

`syncWatchExp` is a built-in method used to create a shorthand registration for a synchronous watcher. Through `syncWatchExp`, developers can pass an expression directly to define synchronous watcher dependencies, and the compiler automatically converts it into a standard `syncWatch` registration.

See: [Watchers](docs://basic/watchers-and-side-effects.md#watchers), [Convenience Registration](docs://basic/watchers-and-side-effects.md#convenience-registration)

---

## defaultProps

`defaultProps` is a built-in method used to define default values for component attributes. Through `defaultProps`, developers can specify defaults for normal attributes and event attributes. When the parent component does not pass the corresponding attributes, those defaults are used.

See: [Attributes](docs://components/attributes.md)

---

## defaultRefs

`defaultRefs` is a built-in method used to define default values for component reference attributes. Through `defaultRefs`, developers can specify defaults for reference attributes. When the parent component does not pass the corresponding references, those defaults are used.

See: [Reference Attributes](docs://components/attributes.md#reference-attributes)