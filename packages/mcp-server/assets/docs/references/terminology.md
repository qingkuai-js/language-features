---
description: ""
---

# Terminology Reference

To help you understand and use Qingkuai more efficiently, this section collects common terms used throughout the documentation and gives a short explanation for each one. Whether you are just getting started with the framework or already reading the source code, this reference can help you clarify terminology and reduce misunderstandings.

<div class="custom-block tip">
    This section is mainly used to keep terminology and phrasing consistent. Explanations follow the most common meanings used across the documentation.
</div>

---

## Component File

A component file is a file with the `.qk` extension. Each component file represents a component declaration.

See: [Introduction](docs://getting-started/introduction.md), [Component Basics](docs://components/basic.md)

---

## Event

An event is an event attribute declared with the `@` prefix. It is used to bind interaction logic in templates or expose callable callbacks to the outside of a component.

See: [Event Handling](docs://basic/event-handling.md), [Events](docs://components/attributes.md#events)

---

## Static Attribute

A static attribute is an attribute whose value does not depend on an interpolation expression when declared in a template. It is usually used to bind plain string data.

See: [Interpolation](docs://basic/interpolation.md)

---

## Dynamic Attribute

A dynamic attribute is an attribute declared with the `!` prefix whose value is computed from an interpolation expression. It is suitable for binding non-string data such as booleans and objects.

See: [Dynamic Attributes](docs://basic/interpolation.md#dynamic-attributes)

---

## Reference Attribute

A reference attribute is a writable attribute channel declared with the `&` prefix. It can be used not only on component tags, but also on specific native HTML tags such as `input`, `textarea`, and `select` to establish value synchronization or reference passing. Inside a component, this kind of data is usually accessed and updated through `refs`.

See: [Reference Attributes](docs://basic/reference-attributes.md), [Form Handling](docs://basic/forms.md), [Reference Attributes](docs://components/attributes.md#reference-attributes)

---

## Reactive, Reactivity, and Reactive Values

These three terms are related, but they emphasize different things in the documentation:

- Reactive: a capability or mechanism that allows value changes to be observed and dependency updates to be triggered.
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

See: [Side Effects](docs://basic/watchers-and-side-effects.md#side-effects)

---

## Scope

Scope describes the range in a template or script where identifiers can be accessed. It especially affects variable visibility in slot and directive contexts.

See: [Scope](docs://components/slots.md#scope)

---

## qk:spread

`qk:spread` is a built-in element in Qingkuai. It is commonly used as a virtual mounting point for directives and is not rendered as a real DOM element.

See: [Built-in Elements](docs://misc/builtin-elements.md)

---

## props

`props` is a compiler intrinsic used to read normal attributes and event attributes passed into a component.

See: [Attributes](docs://components/attributes.md), [Compiler Intrinsics](docs://references/intrinsics.md)

---

## refs

`refs` is a compiler intrinsic used to access reference attributes inside a component and perform writable updates.

See: [Reference Attributes](docs://components/attributes.md#reference-attributes), [Compiler Intrinsics](docs://references/intrinsics.md)

---

## Interpolation Attribute

Interpolation attributes are a collective term for a group of special attributes, including `directives`, `dynamic attributes`, `reference attributes`, and `events`.

See: [Compilation Directives](docs://basic/compilation-directives.md), [Dynamic Attributes](docs://basic/interpolation.md#dynamic-attributes), [Reference Attributes](docs://basic/reference-attributes.md), [Event Handling](docs://basic/event-handling.md), [Attributes](docs://components/attributes.md)

---

## Interpolation Block

An interpolation block is any place in a template where a JavaScript or TypeScript expression is embedded inside a pair of curly braces. It includes both the value part of [interpolation attributes](#interpolation-attribute) and [text interpolation](docs://basic/interpolation.md#text-interpolation).

---

## Embedded Script Block

An embedded script block is a region wrapped by `lang-js` or `lang-ts` tags, used for writing script content that will be processed by the compiler.

See: [Introduction](docs://getting-started/introduction.md), [Design Philosophy](docs://getting-started/introduction.md#design-philosophy)

---

## Embedded Style Block

An embedded style block is a region wrapped by `lang-css`, `lang-scss`, `lang-sass`, `lang-less`, `lang-stylus`, or `lang-postcss` tags inside a component file, used for writing style content that will be processed by the compiler.

See: [Introduction](docs://getting-started/introduction.md), [Stylesheets](docs://components/stylesheets.md)

---

## Embedded Language Tags

Embedded language tags refer to the eight tags `lang-js`, `lang-ts`, `lang-css`, `lang-scss`, `lang-sass`, `lang-less`, `lang-stylus`, and `lang-postcss`, which are used to embed script and style content that needs compilation.

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

## Compiler Intrinsics

Compiler intrinsics are reserved identifiers that do not need to be declared in component files and can be recognized and handled directly by the compiler. They mainly include object-like intrinsics and method-like intrinsics.

Object-like intrinsics include `refs`, `props`, and `slots`.

Method-like intrinsics are the [built-in methods](#built-in-methods).

Among them, `refs` is used to access reference attributes, `props` is used to access normal attributes and event attributes, and `slots` is used to check whether slot content has been passed in.

See: [Attributes](docs://components/attributes.md), [Slots](docs://components/slots.md), [Built-in Methods](#built-in-methods), [Compiler Intrinsics](docs://references/intrinsics.md)

---

## Built-in Methods

Built-in methods are part of the compiler intrinsics. They refer to the 11 method identifiers that can be used directly in component files: `reactive`, `shallow`, `alias`, `derived`, `derivedExp`, `watchExp`, `preWatchExp`, `postWatchExp`, `syncWatchExp`, `defaultProps`, and `defaultRefs`. They are essentially compile-time markers that are transformed into internal method calls during compilation.

See: [Reactivity Declaration](docs://basic/reactivity.md#reactivity-declaration), [Watchers](docs://basic/watchers-and-side-effects.md#watchers), [Compiler Intrinsics](docs://references/intrinsics.md)
