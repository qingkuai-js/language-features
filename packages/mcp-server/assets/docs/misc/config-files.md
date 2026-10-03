# Configuration Files

When building applications with Qingkuai, you usually do not need complicated configuration to get an out-of-the-box development experience. In real projects, however, to adapt to different development needs or customize behavior, Qingkuai provides a flexible configuration file mechanism that helps you control the way it works more precisely. A unified configuration mechanism not only improves project consistency, but also makes team collaboration smoother, serving as an important foundation for building maintainable applications.

---

## Runtime Configuration

Qingkuai's runtime configuration is modified through the `.qingkuairc` file. Component files are affected by the runtime configuration file in the current directory or its nearest parent directory. For example, in the following directory structure, the `Hello` component file is affected by the configuration file in its own directory, while the `App` component is affected by the configuration file in the project root:

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

This property configures the reactivity mode that Qingkuai infers by default. It is a string whose allowed values are `reactive` and `shallow`, and its default value is `reactive`:

- `reactive`: uses deep reactivity, so nested objects and arrays are also tracked automatically.
- `shallow`: uses shallow reactivity, so only changes to top-level values are tracked automatically, and nested values are not tracked automatically.

### whitespace

This property configures how whitespace in templates is handled. It is a string whose allowed values are `preserve`, `trim`, `collapse`, and `trim-collapse`, and its default value is `trim-collapse`:

- `preserve`: keeps all whitespace in the template unchanged.
- `trim`: trims extra whitespace at element boundaries.
- `collapse`: collapses consecutive whitespace characters into a single space.
- `trim-collapse`: applies both `trim` and `collapse` rules at the same time. This is the default behavior.

### preserveHtmlComments

This property configures whether HTML comment nodes are preserved. It is a string whose allowed values are `never`, `always`, `development`, and `production`, and its default value is `development`.

### requireReactivityMark

This property configures whether top-level variable declarations in script blocks must be explicitly marked with a reactivity built-in method (`raw`, `reactive`, `shallow`, `derived`, or `alias`). It is a boolean whose default value is `false`. When enabled, top-level variable declarations that are not explicitly marked cause a compile error.

### resolveImportExtension

This property configures whether the `.qk` extension may be omitted in import statements inside component files. It is a boolean value and defaults to `true`:

```js
// Resolved as ./Component.qk
import Component from "./Component"
```

### allowConstReactive

This property configures whether constant declarations may be marked as reactive. It is a boolean value and defaults to `true`. When set to `false`, variables declared in constant declarations are not [inferred](docs://references/reactivity-infer-rules.md) as having reactivity, and explicitly marking a constant declaration with `reactive` or `shallow` causes a compile error.

### interpretiveComments

This property configures whether interpretive comments are inserted into compilation output. It is a boolean value and defaults to `true`.

---

## Formatting Configuration

Formatting support in the Qingkuai language service is implemented through [prettier-plugin-qingkuai](https://www.npmjs.com/package/prettier-plugin-qingkuai), which is a Prettier plugin. Formatting for component files follows standard [Prettier configuration](https://prettier.io/docs/options). Among these options, some additional configuration options only take effect for component files; they are placed directly as top-level properties alongside standard Prettier options, for example:

```json
{
    "tabWidth": 4,
    "printWidth": 80,
    "spaceAroundInterpolation": true
}
```

### spaceAroundInterpolation

This property configures whether spaces are inserted at the beginning and end of interpolation blocks. It is a boolean value and defaults to `false`. When set to `true`, formatting becomes:

```qk
<div #for={ item, index of 3 }>{ index }: { item }</div>
```

### selfCloseEmptySlotTags

This property configures whether empty `slot` tags are converted to a self-closing format. It is a boolean value and defaults to `true`. When set to `true`, an empty `slot` tag is converted to the self-closing format, while setting it to `false` keeps the original format and leaves it unmodified:

```qk
<slot />
```

### componentTagFormatPreference

This property configures the preferred style of component tags. It is a string whose allowed values are `camel` and `kebab`, and its default value is `camel`. Changing it affects the format of component tag completion suggestions provided by the Qingkuai language server.

### componentAttributeFormatPreference

This property configures the preferred style of component attributes. It is a string whose allowed values are `camel` and `kebab`, and its default value is `camel`. Changing it affects the format of component attribute completion suggestions provided by the Qingkuai language server.
