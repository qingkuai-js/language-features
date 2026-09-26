# Built-in Identifiers

Built-in identifiers are reserved identifiers that do not need to be declared inside component files and can be recognized and handled directly by the compiler. They are mainly used to access component attributes, reference attributes, slot state, and contexts, as well as to call built-in methods provided by the compiler.

Among them, the built-in methods suffixed with `Exp` (`derivedExp`, `watchExp`, etc.) are expression shorthands for the corresponding APIs: the compiler wraps the passed expression into a getter, which is equivalent to passing an equivalent function literal to the corresponding method.

---

## props

`props` is used to read normal attributes and event attributes passed in from outside the component. Through it, a component can access data and event handlers passed by its parent, enabling communication and data flow between components.

See: [Component Attributes](docs://components/attributes.md)

---

## refs

`refs` is used to access reference attributes inside a component and perform writable updates. Through it, a component can obtain reference data passed in by its parent and modify that data directly to implement two-way binding or other interaction effects.

See: [Component Attributes](docs://components/attributes.md#reference-attributes), [Component Reference Attributes](docs://components/attributes.md#reference-attributes)

---

## slots

`slots` is used to determine whether slot content has been passed into a component. Through it, a component can adjust its rendering logic based on whether the parent provides slot content.

See: [Slots](docs://components/slots.md), [Render by Slot Presence](docs://components/slots.md#render-by-slot-presence)

---

## contexts

`contexts` is used to read context data inside a component. Every component has its own contexts layer whose prototype points to the parent component's contexts layer, so reads walk up the prototype chain and resolve to the nearest value: a key written in the component's own layer shadows the key inherited from the parent without affecting the parent's value.

See: [Contexts](docs://components/contexts.md)

---

## instance

`instance` refers to the component's own instance. Its main purpose is to pass the current component instance to external logic, where external modules need it as the binding argument when calling instance-bound runtime APIs (such as `setContext`, `watch`, and other methods imported from the [runtime package](docs://references/terminology.md#runtime-package)).

See: [Component Instance Types](docs://misc/typescript.md#componentinstance), [External Registration of Watchers and Side Effects](docs://basic/watchers-and-side-effects.md#external-registration), [Using Contexts Outside Components](docs://components/contexts.md#using-outside-components)

---

## reactive

`reactive` is a built-in method used to explicitly mark an identifier as having deep reactivity. How the compiler handles that identifier depends on how it is declared: when declared with `let` or `var`, both the identifier itself and all of its nested properties are inferred as reactive; when declared with `const`, the identifier itself cannot be reassigned, so only its properties are recursively inferred as reactive.

See: [Reactivity Declaration](docs://basic/reactivity.md#reactivity-declaration), [Reactivity Mode](docs://basic/reactivity.md#reactivity-mode), [Reactivity Inference Rules](docs://references/reactivity-infer-rules.md)

---

## shallow

`shallow` is a built-in method used to explicitly mark an identifier as having shallow reactivity. How the compiler handles that identifier depends on how it is declared: when declared with `let` or `var`, only the identifier itself is inferred as reactive and its properties do not participate in reactive inference; when declared with `const`, only its first-level properties are inferred as reactive, and deeper properties are not.

See: [Reactivity Declaration](docs://basic/reactivity.md#reactivity-declaration), [Reactivity Mode](docs://basic/reactivity.md#reactivity-mode), [Reactivity Inference Rules](docs://references/reactivity-infer-rules.md)

---

## raw

`raw` is a built-in method used to explicitly mark an identifier as a static value: an identifier marked with `raw` is not given reactive behavior by the compiler, so modifying it does not trigger page updates. In addition, in template interpolations or script expressions, pass an expression to the `raw` method to perform a **non-reactive read**: dependency tracking is paused during evaluation, and during reactivity inference the identifiers read within it are also not counted as accesses in the template.

See: [Reactivity Declaration](docs://basic/reactivity.md#reactivity-declaration), [Non-reactive Reads](docs://basic/reactivity.md#non-reactive-reads), [Reactivity Inference Rules](docs://references/reactivity-infer-rules.md)

---

## alias

`alias` is a built-in method used to create an alias for an identifier. Through `alias`, developers can simplify complex access or write operations into more direct expressions while preserving reactivity.

See: [Reactive Aliases](docs://basic/reactivity.md#reactive-aliases), [Attribute Destructuring](docs://components/attributes.md#reactive-destructuring)

---

## derived

`derived` is a built-in method used to create derived reactive state. Through `derived`, developers can define new reactive state based on existing reactive state. These derived states automatically track dependencies and update when those dependencies change.

See: [Derived Reactive State](docs://basic/reactivity.md#derived-reactive-state)

---

## derivedExp

`derivedExp` is a built-in method used to declare derived reactive state in expression form, equivalent to passing a getter to `derived`. It is suitable for relatively simple computation logic.

See: [Derived Reactive State](docs://basic/reactivity.md#derived-reactive-state), [Reactivity Inference Rules](docs://references/reactivity-infer-rules.md)

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

## watch

`watch` is a built-in method used to register a watcher for reactive state. When the observed value changes, the callback is invoked with the previous value and the current value. `watch` can be called directly without any import; the compiler binds it to the current component instance and cleans it up when the component is destroyed.

See: [Watchers](docs://basic/watchers-and-side-effects.md#watchers)

---

## preWatch

`preWatch` is a built-in method used to register a pre-watcher. A pre-watcher is triggered before the update scheduler runs, which is suitable for logic that needs to run after state changes but before template updates. `preWatch` can be called directly without any import; the compiler binds it to the current component instance and cleans it up when the component is destroyed.

See: [Pre-Watchers](docs://basic/watchers-and-side-effects.md#pre-watchers)

---

## postWatch

`postWatch` is a built-in method used to register a post-watcher. A post-watcher is triggered after scheduled updates are complete, which is suitable for logic that needs to wait until the state is stable or the DOM has been updated. `postWatch` can be called directly without any import; the compiler binds it to the current component instance and cleans it up when the component is destroyed.

See: [Post-Watchers](docs://basic/watchers-and-side-effects.md#post-watchers)

---

## syncWatch

`syncWatch` is a built-in method used to register a synchronous watcher. Its callback is triggered immediately after a dependent reactive value changes, before the update scheduler runs. `syncWatch` can be called directly without any import; the compiler binds it to the current component instance and cleans it up when the component is destroyed.

See: [Synchronous Watchers](docs://basic/watchers-and-side-effects.md#synchronous-watchers)

---

## effect

`effect` is a built-in method used to register a reactive side effect. Reactive values accessed while the callback runs are collected as dependencies automatically, and the callback reruns whenever any of them changes. `effect` can be called directly without any import; the compiler binds it to the current component instance and cleans it up when the component is destroyed.

See: [Side Effects](docs://basic/watchers-and-side-effects.md#side-effects)

---

## preEffect

`preEffect` is a built-in method used to register a pre-effect. A pre-effect is triggered before the update scheduler runs, which is suitable for logic that needs to run after state changes but before template updates. `preEffect` can be called directly without any import; the compiler binds it to the current component instance and cleans it up when the component is destroyed.

See: [Side Effects](docs://basic/watchers-and-side-effects.md#side-effects)

---

## postEffect

`postEffect` is a built-in method used to register a post-effect. A post-effect is triggered after scheduled updates are complete, which is suitable for logic that needs to wait until the state is stable or the DOM has been updated. `postEffect` can be called directly without any import; the compiler binds it to the current component instance and cleans it up when the component is destroyed.

See: [Side Effects](docs://basic/watchers-and-side-effects.md#side-effects)

---

## syncEffect

`syncEffect` is a built-in method used to register a synchronous effect. Its callback is triggered immediately after a dependent reactive value changes, before the update scheduler runs. `syncEffect` can be called directly without any import; the compiler binds it to the current component instance and cleans it up when the component is destroyed.

See: [Side Effects](docs://basic/watchers-and-side-effects.md#side-effects)

---

## defaults

`defaults` is a built-in method used to define default values for optional component attributes. It accepts an object as its argument: the `props` key specifies defaults for normal attributes and event attributes, the `refs` key specifies defaults for reference attributes, and the `contexts` key specifies defaults for contexts. When the parent component does not pass the corresponding attributes (or the key does not exist in the contexts), those defaults are used.

See: [Attribute Defaults](docs://components/attributes.md#specifying-default-values), [Context Defaults](docs://components/contexts.md#default-values), [Default Value Inference](docs://misc/typescript.md#default-value-inference)

---

## setContext

`setContext` is a built-in method used to write data into the current component's contexts layer. The data written here can be read by this component and all of its descendants through the built-in `contexts` identifier: a key written in the component's own layer shadows the key inherited from the parent without affecting the parent's value.

See: [Contexts](docs://components/contexts.md)

---

## setContextGetter

`setContextGetter` is a built-in method used to write a `getter` into the current component's contexts layer. Unlike `setContext`, when a descendant reads `contexts.key`, the framework **automatically invokes** the `getter`, so it can be used to achieve reactive passing of context values.

See: [Reactivity of Contexts](docs://components/contexts.md#reactive-contexts)

---

## setContextExp

`setContextExp` is a built-in method used to create a shorthand declaration for `setContextGetter`. Through `setContextExp`, developers can pass an expression directly, and the compiler automatically wraps it as a `getter` and converts the call into `setContextGetter`.

See: [Reactive Contexts](docs://components/contexts.md#reactive-contexts)
