# Introduction

Qingkuai is the pinyin of the Chinese word "轻快", conveying the framework's focus on being `lightweight`, `fast` to respond, and offering a more `nimble` development experience. It is a framework for building web interfaces and interactive features. It provides a programming model based on reactive variables and componentized interfaces, and uses a compiler to transform `.qk` source files into minimal, efficient, and strictly optimized `JavaScript` code.

When writing components, component scripts can be placed in embedded language tags. These tags all begin with `lang-`, such as `lang-js`. Content outside those tags is used to write the HTML template. Here is a simple component example:

```qk
<lang-js>
    let count = 1
    let name = "World"

    setTimeout(() => {
        name = "Qingkuai"
    }, 1000)
</lang-js>

<h1> Hello {name}! </h1>

<button
    class="btn"
    @click={count++}
>
    You have clicked {count} times.
</button>

<lang-scss>
    // Add styles for the HTML elements in the component here...
</lang-scss>
```

Available embedded language tags include `js`, `ts`, `css`, `scss`, `sass`, `less`, `postcss`, and `stylus`. Note that code inside `script` and `style` tags is not processed by the compiler. Their raw content is preserved and inserted into the page exactly as in normal HTML:

```qk
<script>
    // Insert a script tag with the same content into HTML
</script>

<style>
    /* Insert a style tag with the same content into HTML */
</style>
```

---

## Design Philosophy

Qingkuai's syntax design philosophy is to introduce as little new syntax as possible and prioritize syntax habits already familiar from mainstream frameworks. Only when an existing design has clearly unreasonable parts does Qingkuai make necessary adjustments. This philosophy is intended to keep the learning curve low, so developers can get started quickly and focus on their actual work.

The choice not to use `script` and `style` as embedded language tags is not simply to make the framework feel unique. It is mainly for practical compatibility reasons: when those tags contain multiple attributes and line breaks, syntax highlighting based on [Textmate](https://macromates.com) breaks:

<!-- prettier-ignore -->
```html
<style
    scoped
    lang="scss"
>
    /* scss cannot be highlighted correctly here */
</style>
```

<div class="custom-block tip">
    If you have used <a href="https://cn.vuejs.org">Vue</a> or <a href="https://svelte.dev">Svelte</a>, you will notice that Qingkuai's template syntax is similar to theirs in many ways. This similarity is intentional and meant to reduce the learning curve. However, behind that familiar syntax, its design trade-offs and implementation path still differ in meaningful ways.
</div>

---

## Why Qingkuai?

Compared with today's popular frontend frameworks, Qingkuai has the following core advantages:

- Bundle size: the runtime is very small, around 8 to 24 KB, or 5 to 11 KB after gzip, and supports a high degree of [Tree-Shaking](https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking). The compiler also deeply optimizes generated output; in common business scenarios with default build settings, the compiled result is typically around 20% to 80% of that of other frameworks, with the actual ratio depending on component complexity and dependency scale.

- Reactivity: the compiler infers reactivity based on how top-level scope identifiers are accessed and written. As a result, when you write code in embedded script blocks, the experience stays very close to native JS or TS. The following example helps illustrate the idea:

    ```qk
    <lang-js>
        // The compiler infers that person needs reactive capability
        const person = {
            age: 30,
            name: "javascript"
        }

        // person's properties are reactive, so modifying them updates the h1 element
        setTimeout(() => {
            person.age = 1
            person.name = "Qingkuai"
        }, 1000)
    </lang-js>

    <h1>My name is {person.name}, I'm {person.age} years old.</h1>
    ```

- TypeScript: the framework supports [TypeScript](https://www.typescriptlang.org/) out of the box with no extra configuration. This helps avoid many potential bugs during development. In addition, the language server handles many details of type hints and inference for component files, such as automatically inferring the types of component and slot context identifiers.

- Debugging experience: the compiler does a significant amount of work to improve debugging. For example, in development mode it avoids noise from reactive declarations and adds matching declarations for context identifiers declared by directives such as [for](/basic/compilation-directives.html#list-rendering) and [slot](/components/slots.html#passing-context).

- Update granularity: Qingkuai does not use a `Virtual DOM`. Changes to reactive variables are mapped directly to native `DOM API` calls. This removes the `diff` overhead of a virtual DOM. Consider the following example:

    ```qk
    <lang-js>
        let count = 0
    </lang-js>

    <p>You clicked {count} times.</p>
    <button @click={count++}>Add Count</button>
    ```

    After the button is clicked, the framework schedules a page update asynchronously, during which it runs a piece of pseudocode similar to this:

    ```js
    pElement.textContent = `You clicked ${count} times.`
    ```

<div class="custom-block tip"><code>@click</code> adds a click event listener to the button element, and when the button is clicked it executes the JavaScript expression <code>count++</code>. More template syntax, including event listeners, will be introduced later.</div>
