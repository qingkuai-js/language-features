---
description: "Qingkuai error code reference: 1xxx compilation errors, 9xxx compilation warnings, 2xxx runtime errors, 8xxx runtime warnings, 3xxx/7xxx language-service messages."
keywords: ["error code", "compilation error", "warning", "runtime error", "1070", "报错", "错误码"]
---

# Error Code Reference

Error codes group by number range: **1xxx** compilation errors (block compilation), **9xxx** compilation warnings (non-blocking), **2xxx** runtime errors, **8xxx** runtime warnings, **3xxx** language-service errors, **7xxx** language-service warnings.

## Compilation Errors (1xxx)

| Code | Description |
|---|---|
| 1001 | Empty interpolation block |
| 1002 | Unexpected character |
| 1003 | Unclosed interpolation block |
| 1004 | Starts with an end tag without a matching opening tag |
| 1005 | Interpolation attribute missing a name (only `!`, `@`, `#`, or `&` written) |
| 1006 | Static attribute value not wrapped in quotes |
| 1007 | Interpolation attribute value not wrapped in curly braces |
| 1008 | Static attribute value not closed |
| 1009 | Tag is not closed (start/end/comment) |
| 1010 | Embedded language tags not at template top level |
| 1011 | Too many embedded script blocks (only one per component file) |
| 1012 | Tag missing a matching end tag |
| 1013 | Tag cannot be self-closing (e.g. `<div />`) |
| 1014 | A tag not allowed in component files was used |
| 1015 | Illegal template structure (e.g. `<div>` inside `<p>`) |
| 1016 | Invalid attribute format |
| 1017 | Framework-reserved identifier format used (`__qk__` prefix) |
| 1018 | Unsupported top-level `await` expression |
| 1019 | Unsupported export forms (`export =`, default export, re-export, namespace/type export) |
| 1020 | Built-in identifier redeclared in top-level scope |
| 1021 | Built-in method used in an invalid position or call form |
| 1022 | Identifier conflicts with alias or derived value markers; cannot be redeclared |
| 1023 | The `defaults` built-in method can only be called once in the embedded script block |
| 1024 | Invalid `alias` arguments; must receive exactly one writable target |
| 1025 | Alias destructuring declaration contains a disallowed pattern |
| 1026 | Directive conflict on the same tag |
| 1027 | Directive missing a required value |
| 1028 | Duplicate attributes or conflicts after parsing (static/dynamic/event/reference) |
| 1029 | Invalid expression |
| 1030 | Tag does not accept the current attribute type |
| 1031 | Missing prerequisite directive (`#elif`, `#else`, `#then`, `#catch`) |
| 1032 | Invalid context pattern |
| 1033 | Unrecognized directive |
| 1034 | Empty context pattern with no binding identifiers |
| 1035 | `#html` tag must contain exactly one text child node |
| 1036 | `#slot` used in an invalid position (only first-level children of a component) |
| 1037 | Too many directive destructuring binding patterns (`#for`, `#then`) |
| 1038 | `#slot` missing a valid string-literal slot name |
| 1039 | `name` attribute of `<slot>` must be a static value |
| 1040 | `#target` in an invalid position (first-level child of a component) |
| 1041 | Expected an expression |
| 1042 | Expected a string literal |
| 1043 | `#key` can only be used together with `#for` |
| 1044 | Expected an event flag name |
| 1045 | Unrecognized event flag |
| 1046 | Event flags conflict |
| 1047 | Invalid reference attribute on this tag (not in the allowed list) |
| 1048 | Invalid reference-attribute value; must be an identifier or member expression |
| 1049 | Invalid special attribute name in omitted form; cannot be converted to a valid identifier |
| 1050 | Duplicate `name` attribute on `<slot>` |
| 1051 | Duplicate assignment to the same slot name within one component |
| 1052 | TypeScript namespace declarations unsupported in embedded script blocks |
| 1053 | `alias` cannot alias a standalone identifier |
| 1054 | Built-in methods cannot be used in `using`/`await using` declarations |
| 1055 | Nested `<slot>` tags are not allowed |
| 1056 | Duplicate `#then` or `#catch` in a promise block |
| 1057 | Invalid component name (not convertible to an identifier or member expression) |
| 1058 | `#html` cannot be used on components or `<slot>` tags |
| 1059 | Built-in method does not support spread arguments |
| 1060 | Invalid element tag name |
| 1061 | Built-in methods cannot be used in templates |
| 1062 | Reactivity modes conflict (`reactive` and `shallow` on the same tag) |
| 1063 | Generic parameters on a component tag are not closed |
| 1064 | Generic parameters on component tags require the embedded script language to be TypeScript |
| 1065 | Hyphens not allowed in member-expression component tags |
| 1066 | Self-closing embedded style tag must provide a `src` attribute |
| 1067 | Embedded style tag with `src` cannot contain inline style content |
| 1068 | `src` attribute on embedded style tag requires a non-empty value |
| 1069 | `#scope` can only be used on components |
| 1070 | Marking a `const` with `reactive`/`shallow` disallowed when `allowConstReactive` is disabled |
| 1071 | `raw` must be passed an argument when used as a non-reactive read |
| 1072 | `raw` can only be passed one argument when used as a non-reactive read |
| 1073 | `raw` must be used as a function call when used as a non-reactive read |
| 1074 | Top-level variable declarations must be explicitly marked with a reactivity built-in method when the `requireReactivityMark` compile option is `true` |

## Compilation Warnings (9xxx)

| Code | Description |
|---|---|
| 9001 | Value never changes; reactive marker redundant, treated as raw |
| 9002 | Top-level identifier may be shadowed in a specific scope |
| 9003 | `#scope` has no effect: current component has no scoped styles |
| 9004 | Derived values are read-only; mutable declarations are redundant; prefer `const` |
| 9005 | `raw` on a literal `const` is redundant |
| 9006 | Directive does not need a value; provided value ignored |
| 9007 | Boolean attribute given a redundant value; ignored |
| 9008 | `#html` with no value and static content has no effect |
| 9009 | Event flags on a component event listener are invalid; ignored |
| 9010 | Keyboard event flags on non-keyboard events; ignored |
| 9011 | Duplicate event flags; ignored |
| 9012 | `<qk:spread>` without required attributes (dynamic attributes, reference attributes, or event listeners) is redundant |
| 9013 | `#scope` unnecessary: component already has an actual ancestor element |
| 9014 | Nesting `raw` calls is redundant: the argument is already a non-reactive read; inner `raw` will be ignored |
| 9015 | Unkeyed `#for` items hold internal state; may leak between items when the list updates |

## Runtime Errors (2xxx)

| Code | Description |
|---|---|
| 2001 | Received value (e.g. for `#await`) is not a `Promise` |
| 2002 | `#for` value is not iterable |
| 2003 | `#key` values contain duplicates |
| 2004 | Max recursive update depth exceeded (recursive updates in async effects/watchers) |
| 2005 | Invalid target element (not an `Element` / selector not found) |
| 2006 | `&group` / multi-select `&value` must be an array or `Set` |
| 2007 | Cannot render: value is neither a component function nor a Promise resolving to one |

## Runtime Warnings (8xxx)

| Code | Description |
|---|---|
| 8001 | No reactive dependencies collected; side effect/watcher destroyed |
| 8002 | Assignment to a read-only or invalid target; ignored |
| 8003 | Content creation attempted after the owning component was destroyed (commonly an async callback creating child components or registering watchers/side effects after removal); creation ignored |
| 8004 | Lifecycle hook registered after its phase passed (e.g. `onAfterMount` in async callback); never fires, registration ignored |

## Language Service (3xxx errors / 7xxx warnings)

| Code | Description |
|---|---|
| 3001 | `Meta` declares an unknown member (only `props`, `refs`, `contexts`) |
| 3002 | `Meta` or a member is not an object type (TS) |
| 3003 | Dependency "qingkuai" not found; make sure it is installed and resolvable |
| 3004 | Imported type with generic parameters used directly as `Meta` |
| 3005 | Types cannot be exported from a component; move to an external `.ts` file and import them |
| 7001 | `Meta` via JSDoc is not an object type (JS) |
| 7002 | `@keyframes` rule is not scoped; define it in an external stylesheet and import it from the app entry file |

## See also

- [Reactivity Inference Rules](docs://agent/references/reactivity-infer-rules.md)
- [Configuration Files](docs://agent/misc/config-files.md)
