# Terminology Reference

To help you understand and use Qingkuai more efficiently, this section collects common terms used throughout the documentation and gives a short explanation for each one. Whether you are just getting started with the framework or already reading the source code, this reference can help you quickly clarify terminology and reduce misunderstandings.

> [!TIP]
> This section is mainly used to keep terminology and phrasing consistent. Explanations follow the common contexts used across the documentation.

---

## Component File

A component file is a file with the `.qk` extension. Each component file represents a component declaration.

See: [Introduction](docs://getting-started/introduction.md#introduction), [Component Basics](docs://components/basic.md)

---

## Component Instance

A component instance is the runtime object created after a component file is compiled. It carries the members exported by the component and its internal state. In a parent component, you can obtain the instance of a child component through the `&handle` reference attribute on the component tag and use it to access the exported members; inside a component file, you can access the component's own instance through the built-in identifier `instance`; it is also the binding argument of the watcher, side effect, and lifecycle methods imported from the `qingkuai` runtime package.

See: [Member Exports](docs://components/exports.md), [Component Reference Attributes](docs://components/attributes.md#reference-attributes)

---

## Event

An event is an event attribute declared with the `@` prefix. It is used to bind interaction logic in templates or expose callable callbacks to the outside of a component.

See: [Event Handling](docs://basic/event-handling.md), [Events](docs://components/attributes.md#events)

---

## Static Attribute

A static attribute is an attribute whose value does not depend on an interpolation expression when declared in a template. It is usually used to bind plain string data.

See: [Static Attributes](docs://components/attributes.md#static-attributes)

---

## Dynamic Attribute

A dynamic attribute is an attribute declared with the `!` prefix whose value is computed from an interpolation expression. It is suitable for binding non-plain-string data such as booleans and objects.

See: [Dynamic Attributes](docs://basic/interpolation.md#dynamic-attributes)

---

## Reference Attribute

A reference attribute is a writable attribute channel declared with the `&` prefix. It can be used not only on component tags, but also on specific native HTML tags such as `input`, `textarea`, and `select` to establish value synchronization or reference passing. Inside a component, this kind of data is usually accessed and updated through `refs`.

See: [Reference Attributes](docs://basic/reference-attributes.md), [Form Handling](docs://basic/forms.md), [Reference Attributes](docs://components/attributes.md#reference-attributes)

---

## Reactive vs Reactivity

These three terms are related, but they emphasize different things in the documentation:

- Reactive: a capability or mechanism that allows value changes to be tracked and dependency updates to be triggered.
- Reactivity: an abstract description of that capability itself, often used when discussing system behavior or design characteristics.
- Reactive value: a concrete unit of data that has reactive capability, such as a value inferred by the compiler or created through a related API.

See: [Reactivity](docs://basic/reactivity.md)

---

## Watcher

A watcher is a mechanism that listens for changes in reactive values and executes a callback. It is commonly used for side-effect control, state comparison, and cleanup logic.

See: [Watchers](docs://basic/watchers-and-side-effects.md#watchers)

---

## Side Effect

A side effect is logic that depends on reactive state and runs after that state changes. Typical examples include DOM interaction, asynchronous requests, and synchronization with external systems.

See: [Side Effects](docs://basic/watchers-and-side-effects.md#side-effects), [External Registration](docs://basic/watchers-and-side-effects.md#external-registration)

---

## Global Watcher

A global watcher is a watcher that is not bound to any component instance and whose lifecycle must be managed manually. It is created by passing `null` as the binding argument to a watcher API imported from the `qingkuai` [runtime package](#runtime-package). It is not cleaned up automatically when a component is destroyed, and is commonly used to register global reactive logic such as global state management.

See: [Watchers](docs://basic/watchers-and-side-effects.md#watchers), [External Registration](docs://basic/watchers-and-side-effects.md#external-registration)

---

## Global Side Effect

A global side effect is a side effect that is not bound to any component instance and whose lifecycle must be managed manually. It is created by passing `null` as the binding argument to a side effect API imported from the `qingkuai` [runtime package](#runtime-package). It is not cleaned up automatically when a component is destroyed, and is commonly used to register global reactive logic such as global event listeners.

See: [Side Effects](docs://basic/watchers-and-side-effects.md#side-effects), [External Registration](docs://basic/watchers-and-side-effects.md#external-registration)

---

## Scope

Scope describes the range in a template or script where identifiers can be accessed. It especially affects variable visibility in slot and directive contexts.

See: [Scope](docs://components/slots.md#scope)

---

## qk:spread

`qk:spread` is a built-in element in Qingkuai. It is commonly used as a virtual mounting point for directives and is not rendered as a real DOM element.

See: [Built-in Elements](docs://misc/builtin-elements.md)

---

## Runtime Package

The runtime package is the [npm](https://www.npmjs.com) package with the `qingkuai` entry point. It exports APIs for component lifecycles, contexts, watchers and side effects, performance optimization, and state transitions. Inside a component file, most APIs are directly available as [built-in methods](#built-in-methods); outside a component file, they must be imported from the runtime package, and APIs that require instance binding (such as lifecycles, watchers, and side effects) take a [component instance](#component-instance) as their first binding argument.

See: [API Reference](docs://references/api.md#runtime)

---

## Compiler Package

The compiler package is the [npm](https://www.npmjs.com) package with the `qingkuai/compiler` entry point. It parses and compiles component source code and is mainly consumed by build tools, language services, and the plugin ecosystem; application code rarely needs to depend on it directly.

See: [API Reference](docs://references/api.md#compiler-qingkuaicompiler)

---

## props

`props` is a built-in identifier used to read normal attributes and event attributes passed into a component.

See: [Attributes](docs://components/attributes.md), [Built-in Identifiers](docs://references/intrinsics.md)

---

## refs

`refs` is a built-in identifier used to access reference attributes inside a component and perform writable updates.

See: [Reference Attributes](docs://components/attributes.md#reference-attributes), [Built-in Identifiers](docs://references/intrinsics.md)

---

## contexts

`contexts` is a built-in identifier used to read context data inside a component. The data is written through the `setContext` family of APIs — either the component's built-in methods or methods imported from the runtime package.

See: [Contexts](docs://components/contexts.md), [Built-in Identifiers](docs://references/intrinsics.md), [API Reference](docs://references/api.md)

---

## instance

`instance` is a built-in identifier that refers to the component's own instance. Its main purpose is to be passed to external logic, so that external modules can pass it in as an argument when calling instance-bound runtime APIs.

See: [Built-in Identifiers: instance](docs://references/intrinsics.md#instance)

---

## Interpolated Attribute

Interpolated attributes are a collective term for a group of special attributes, including `directives`, `dynamic attributes`, `reference attributes`, and `events`.

See: [Compilation Directives](docs://basic/compilation-directives.md), [Dynamic Attributes](docs://basic/interpolation.md#dynamic-attributes), [Reference Attributes](docs://basic/reference-attributes.md), [Event Handling](docs://basic/event-handling.md), [Attributes](docs://components/attributes.md)

---

## Interpolation Block

An interpolation block is any place in a template where a JavaScript or TypeScript expression is embedded inside a pair of curly braces. It includes both the value part of [interpolated attributes](#interpolated-attribute) and [text interpolation](docs://basic/interpolation.md#text-interpolation). Interpolation blocks are reactive by default; you can use the built-in method `raw` or the `noTracking` runtime API to perform a [non-reactive read](docs://basic/reactivity.md#non-reactive-reads).

---

## Embedded Script Block

An embedded script block is a region wrapped by `lang-js` or `lang-ts` tags, used for writing script content that will be processed by the compiler.

See: [Introduction](docs://getting-started/introduction.md#introduction), [Syntax Design](docs://getting-started/introduction.md#syntax-design)

---

## Embedded Style Block

An embedded style block is a region wrapped by `lang-css`, `lang-scss`, `lang-sass`, `lang-less`, `lang-stylus`, or `lang-postcss` tags inside a component file, used for writing style content that will be processed by the compiler. These tags support a static `src` attribute for external style files and a boolean `global` attribute for global style blocks.

See: [Introduction](docs://getting-started/introduction.md), [Stylesheets](docs://components/stylesheets.md)

---

## Embedded Language Tags

Embedded language tags refer to the eight tags `lang-js`, `lang-ts`, `lang-css`, `lang-scss`, `lang-sass`, `lang-less`, `lang-stylus`, and `lang-postcss`, which are used to embed script and style content that needs compilation. Style tags support static attributes such as `src` and `global`.

See: [Introduction](docs://getting-started/introduction.md), [Stylesheets](docs://components/stylesheets.md)

---

## Slot Outlet

A slot outlet is the placeholder location declared with the `slot` tag inside a component. It is used to receive slot content passed in from outside.

See: [Slots](docs://components/slots.md)

---

## Slot Content

Slot content is the child content passed in by the component consumer. It is rendered at the corresponding [slot outlet](#slot-outlet).

See: [Slots](docs://components/slots.md)

---

## Built-in Identifiers

Built-in identifiers are reserved identifiers that do not need to be declared in component files and can be recognized and handled directly by the compiler. They mainly include object-like identifiers and method-like identifiers.

Object-like identifiers include `refs`, `props`, `slots`, `contexts`, and `instance`.

Method-like identifiers are the [built-in methods](#built-in-methods).

Among them, `refs` is used to access reference attributes, `props` is used to access normal attributes and event attributes, `slots` is used to check whether slot content has been passed in, `contexts` is used to read context data, and `instance` is used to access the component's own instance.

See: [Attributes](docs://components/attributes.md), [Slots](docs://components/slots.md), [Built-in Methods](#built-in-methods), [Built-in Identifiers](docs://references/intrinsics.md)

---

## Built-in Methods

Built-in methods are part of the built-in identifiers. They refer to the method identifiers that can be used directly in component files, covering categories such as reactivity marking, default value declaration, context writing, watcher and side effect registration, and lifecycles. They are essentially compile-time markers that are transformed into internal method calls during compilation and automatically bound to the current component instance.

See: [Reactivity Declaration](docs://basic/reactivity.md#reactivity-declaration), [Watchers](docs://basic/watchers-and-side-effects.md#watchers), [Lifecycle](docs://components/lifecycle.md), [Built-in Identifiers](docs://references/intrinsics.md)
