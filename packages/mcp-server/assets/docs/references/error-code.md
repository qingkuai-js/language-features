---
description: ""
---

# Error Code Reference

The Qingkuai compiler and runtime can emit messages with error codes to help developers locate problems quickly. This section lists the built-in error codes in the current version and explains their meanings for easier lookup and troubleshooting. Error codes are grouped by category, using the following numbering scheme:

- 1xxx: compile errors. These mean the code cannot pass compilation and usually require syntax or logic fixes.
- 9xxx: compile warnings. These indicate potential problems or discouraged usage, but they do not block compilation.
- 2xxx: runtime errors. These indicate fatal problems during execution and may interrupt the program.
- 8xxx: runtime warnings. These indicate non-blocking abnormal behavior during execution and should still be reviewed.
- 3xxx: language service errors. These indicate problems when using language service features in the IDE and may affect development experience.
- 7xxx: language service warnings. These indicate non-blocking issues when using language service features in the IDE and should be reviewed.

Looking up messages by code can improve debugging efficiency and help you understand framework behavior more clearly.

---

## Compile Errors

| Code | Description                                                                                                                                |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1001 | Empty interpolation block                                                                                                                  |
| 1002 | Unexpected character                                                                                                                       |
| 1003 | Unclosed interpolation block                                                                                                               |
| 1004 | Starts with an end tag, such as `</div>` without a matching opening `<div>` before it                                                      |
| 1005 | Interpolation attribute is missing a name, for example writing only `!`, `@`, `#`, or `&`                                                  |
| 1006 | Static attribute value is not wrapped in single or double quotes                                                                           |
| 1007 | Interpolation attribute value is not wrapped in curly braces                                                                               |
| 1008 | Static attribute value is not closed                                                                                                       |
| 1009 | Tag is not closed, including start tags, end tags, or comment tags                                                                         |
| 1010 | Embedded language tags are not used at template top level                                                                                  |
| 1011 | Too many embedded script blocks, only one is allowed per component file                                                                    |
| 1012 | Tag is missing a matching end tag                                                                                                          |
| 1013 | Tag cannot be used as a self-closing tag, such as `<div />`                                                                                |
| 1014 | A tag not allowed in component files was used                                                                                              |
| 1015 | Illegal template structure, such as nesting `<div>` inside `<p>`                                                                           |
| 1016 | Invalid attribute format                                                                                                                   |
| 1017 | Uses a framework-reserved identifier format, identifiers starting with `__qk__`                                                            |
| 1018 | Unsupported top-level `await` expression                                                                                                   |
| 1019 | Embedded script blocks do not support these export forms: `export =`, default export, re-export, namespace export, or type export         |
| 1020 | Compiler intrinsic is redeclared in top-level scope                                                                                        |
| 1021 | Compiler built-in method is used in an invalid position or call form                                                                       |
| 1022 | Identifier cannot be redeclared because it conflicts with alias or derived value markers                                                   |
| 1023 | Reactive marker styles conflict, such as mixing `$` shorthand with other marker styles                                                     |
| 1024 | Invalid arguments for the `alias` built-in method; it must receive exactly one writable target                                             |
| 1025 | Alias destructuring declaration contains a disallowed pattern                                                                              |
| 1026 | Directive conflict; they cannot coexist on the same tag                                                                                    |
| 1027 | Directive is missing a required value                                                                                                      |
| 1028 | Duplicate attributes or attributes that conflict after parsing, including conflicts among static, dynamic, event, and reference attributes |
| 1029 | Invalid expression                                                                                                                         |
| 1030 | Tag does not accept the current attribute type, such as an invalid reference attribute or event attribute                                  |
| 1031 | Missing prerequisite directive, such as `#elif`, `#else`, `#then`, or `#catch`                                                             |
| 1032 | Invalid context pattern                                                                                                                    |
| 1033 | Unrecognized directive                                                                                                                     |
| 1034 | Empty context pattern with no binding identifiers declared                                                                                 |
| 1035 | A `#html` directive tag must contain exactly one text child node                                                                           |
| 1036 | `#slot` is used in an invalid position; it is allowed only on first-level child elements of a component node                               |
| 1037 | Too many directive binding patterns, such as on `#for` or `#then`                                                                          |
| 1038 | `#slot` is missing a valid slot name; the value after `from` must be a string literal                                                      |
| 1039 | The `name` attribute of `<slot>` must be a static value                                                                                    |
| 1040 | `#target` is used in an invalid position; using it on a first-level child of a component causes target ambiguity                           |
| 1041 | Expected an expression                                                                                                                     |
| 1042 | Expected a string literal                                                                                                                  |
| 1043 | `#key` can only be used together with `#for`                                                                                               |
| 1044 | Expected an event flag name                                                                                                                |
| 1045 | Unrecognized event flag                                                                                                                    |
| 1046 | Event flags conflict                                                                                                                       |
| 1047 | Invalid reference attribute on this tag; it is not in the allowed list                                                                     |
| 1048 | Invalid reference attribute value; it must be an identifier or member expression                                                           |
| 1049 | Invalid special attribute name in omitted form; it cannot be converted into a legal identifier                                             |
| 1050 | Duplicate `name` attribute on `<slot>`                                                                                                     |
| 1051 | Duplicate assignment to the same slot name within one component                                                                            |
| 1052 | TypeScript namespace declarations are not supported in embedded script blocks                                                              |
| 1053 | `alias` cannot be used to alias a standalone identifier                                                                                    |
| 1054 | Compiler built-in methods cannot be used in `using` or `await using` declarations                                                          |
| 1055 | Nested `<slot>` tags are not allowed                                                                                                       |
| 1056 | Duplicate `#then` or `#catch` directives in a promise block                                                                                |
| 1057 | Invalid component name; it cannot be converted into a valid JavaScript identifier or member expression                                     |
| 1058 | `#html` cannot be used on components or `<slot>` tags                                                                                      |
| 1059 | The specified built-in method does not support spread arguments                                                                            |
| 1060 | Invalid element tag name                                                                                                                   |
| 1061 | Compiler built-in methods cannot be used in templates                                                                                      |
| 1062 | Reactivity modes conflict; the same tag declares both `reactive` and `shallow`                                                             |
| 1063 | Generic parameters on a component tag are not closed                                                                                       |
| 1064 | Generic parameters on a component tag can only be used when the embedded script language is `TypeScript`                                   |
| 1065 | Hyphens are not allowed when using a member expression as a component tag                                                                   |

---

## Compile Warnings

| Code | Description                                                                                                             |
| ---- | ----------------------------------------------------------------------------------------------------------------------- |
| 9001 | Value never changes, so the reactive marker is redundant and the value will be treated as raw                           |
| 9002 | A top-level scope identifier may be shadowed in a specific scope                                                        |
| 9003 | Two declaration syntaxes for derived reactive values are mixed, which is discouraged                                    |
| 9004 | Derived reactive values are read-only, so using a mutable declaration is redundant; `const` is recommended              |
| 9005 | Applying `raw` to a literal `const` is redundant                                                                        |
| 9006 | The directive does not need a value, so the provided value will be ignored                                              |
| 9007 | A boolean attribute is given a redundant value, which will be ignored                                                   |
| 9008 | `#html` has no practical effect when it has no value and the content is static                                          |
| 9009 | Event flags on a component event listener are invalid and will be ignored                                               |
| 9010 | Keyboard event flags are invalid on non-keyboard events and will be ignored                                             |
| 9011 | Duplicate event flags will be ignored                                                                                   |
| 9012 | A `<qk:spread>` tag without required parts (such as dynamic attributes, reference attributes, or event listeners) is unnecessary |
| 9013 | Duplicate default value definitions; the later one overrides the earlier one                                            |
| 9016 | Built-in method received more arguments than expected; extra arguments will be ignored                                  |

---

## Runtime Errors

| Code | Description                                                                                                     |
| ---- | --------------------------------------------------------------------------------------------------------------- |
| 2001 | The received value for a specific usage, such as `#await`, is not a `Promise`                                   |
| 2002 | The value of `#for` is not iterable                                                                             |
| 2003 | The value of `#key` contains duplicates                                                                         |
| 2004 | Maximum recursive update depth exceeded, commonly caused by recursive updates in async side effects or watchers |
| 2005 | Invalid target element; it is not a valid `Element`, or it cannot be obtained through the selector              |
| 2006 | The specified property value must be an array or `Set`                                                          |

---

## Runtime Warnings

| Code | Description                                                                                                           |
| ---- | --------------------------------------------------------------------------------------------------------------------- |
| 8001 | No reactive dependencies were collected when executing a side effect or watcher, so the side effect will be destroyed |
| 8002 | An assignment was performed on a read-only or invalid target, and the assignment will be ignored                      |

---

## Language Service Errors

| Code | Description                                                                                                    |
| ---- | -------------------------------------------------------------------------------------------------------------- |
| 3001 | Imported external types that include generic parameters cannot be used as global types, such as Props and Refs |
| 3002 | (TypeScript) A global type declaration is not an object type, such as a primitive or union type                |

---

## Language Service Warnings

| Code | Description                                                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7001 | (JavaScript) A global type declaration defined via `JSDoc` is not an object type, such as a primitive or union type                                           |
| 7002 | `@keyframe` rules are not scoped with component attributes, so using them in a component stylesheet is unnecessary and should be moved to a global stylesheet |
