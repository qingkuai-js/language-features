# Configuration Files

When building applications with Qingkuai, you usually do not need complicated setup to get an out-of-the-box development experience. In real projects, however, Qingkuai provides a flexible configuration system so that you can adapt its behavior to different development needs and customization requirements. A unified configuration mechanism improves project consistency, makes team collaboration smoother, and provides a solid foundation for maintainable applications.

---

## Runtime Configuration

Qingkuai runtime behavior can be configured through the `.qingkuairc` file. Component files are affected by the runtime configuration file in the current directory or the nearest parent directory. For example, in the following directory structure, the `Hello` component is affected by the configuration file in its own directory, while `App` is affected by the configuration file in the project root:

```txt
qingkuai-app
├── src
│   ├── Components
│   │   ├── Hello.qk
│   │   └── .qingkuairc
│   └── App.qk
└── .qingkuairc
```

### reactivityMode

This property configures which reactivity constructor Qingkuai uses by default. It is a string whose allowed values are `reactive` and `shallow`, and its default value is `reactive`:

- `reactive`: uses deep reactivity, so nested objects and arrays are also tracked automatically.
- `shallow`: uses shallow reactivity, so only top-level value changes are tracked automatically.

### whitespace

This property configures how whitespace in templates is handled. It is a string whose allowed values are `preserve`, `trim`, `collapse`, and `trim-collapse`, and its default value is `trim-collapse`:

- `preserve`: keeps all whitespace in the template unchanged.
- `trim`: trims extra whitespace at element boundaries.
- `collapse`: collapses consecutive whitespace characters into a single space.
- `trim-collapse`: applies both `trim` and `collapse` rules at the same time. This is the default behavior.

### preserveHtmlComments

This property configures whether HTML comment nodes are preserved. It is a string whose allowed values are `never`, `always`, `development`, and `production`, and its default value is `development`.

### resolveImportExtension

This property configures whether the `.qk` extension may be omitted in import statements inside component files. It is a boolean value and defaults to `true`:

```js
// Resolved as ./Component.qk
import Component from "./Component"
```

### shorthandDerivedDeclaration

This property configures whether shorthand declarations for derived reactive state are enabled. It is a boolean value and defaults to `true`. When enabled, identifiers that start with `$` in the top-level scope of an embedded script block are automatically compiled into [derived reactive state](docs://basic/reactivity.md#derived-reactive-state). Setting it to `false` disables this behavior:

```js
// Shorthand declaration of derived reactive state
const $double = number * 2
```

### interpretiveComments

This property configures whether interpretive comments are inserted into compilation output. It is a boolean value and defaults to `true`.

---

## Formatting Configuration

Formatting support in the Qingkuai language service is implemented through [prettier-plugin-qingkuai](https://www.npmjs.com/package/prettier-plugin-qingkuai), which is a Prettier plugin. Formatting for component files therefore follows standard [Prettier configuration](https://prettier.io/docs/options). Some additional options only apply to component files. These options must be placed under the `qingkuai` object in your Prettier configuration file, for example:

```json
{
    "tabWidth": 4,
    "printWidth": 80,
    "qingkuai": {
        "spaceAroundInterpolation": true
    }
}
```

### spaceAroundInterpolation

This property configures whether spaces are inserted at the beginning and end of interpolation blocks. It is a boolean value and defaults to `false`. When set to `true`, formatting becomes:

```qk
<div #for={ item, index of 3 }>{ index }: { item }</div>
```

### componentTagFormatPreference

This property configures the preferred style of component tags. It is a string whose allowed values are `camel` and `kebab`, and its default value is `camel`. Changing it affects the format of component tag completion suggestions provided by the Qingkuai language server.

### componentAttributeFormatPreference

This property configures the preferred style of component attributes. It is a string whose allowed values are `camel` and `kebab`, and its default value is `camel`. Changing it affects the format of component attribute completion suggestions provided by the Qingkuai language server.
