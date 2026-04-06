# 2026-04-06

> packages version: vscode-extension@1.0.7, language-service@1.0.16, qingkuai@1.0.58

fix some known issues:

1. fixed a language-service crash caused by incorrect source locations reported by the qingkuai compiler for generic parameter errors
2. fixed qingkuai package type declarations being mistakenly excluded by `.vscodeignore`
3. filtered redundant internal type information from hover content
4. updated `#slot` directive hover documentation to match the current syntax

# 2026-04-06

> packages version: vscode-extension@1.0.7, language-service@1.0.15

major update:

1. improved build workflow and packaging stability for local publishing and release output
2. added formatter support for component tags with generic parameters to preserve type arguments during formatting

# 2026-04-06

> packages version: vscode-extension@1.0.6, language-service@1.0.14

fix some known issues:

1. the compiler intrinsics `raw`, `reactive` and `shallow` can accept no argument, modify the first argument types as optional
2. the type declaration of `props` intrinsic identifier has not been wrapped with `Readonly`

# 2026-04-05

> packages version: vscode-extension@1.0.5, language-service@1.0.12

major update:

1. optimized qk file export type definitions and generic inference behavior
2. added two language-service diagnostics: `GlobalTypeIsNonObject` and `ExternalGlobalTypeWithGenerics`
3. improved component global type analysis for both TypeScript and JSDoc declarations, including external global-type generic checks
4. language-service diagnostics now support documentation URLs via `codeDescription`
5. improved completion and hover filtering for preserved internal utility identifiers
6. refactored qk content edit/index-map synchronization to remove legacy `exportValueSourceRange` coupling
7. unified typescript-plugin log channel forwarding between typescript-plugin and language-server
8. fixed implementation/reference result filtering to avoid dropping valid source locations

# 2026-04-04

> packages versions: vscode-extension@1.0.4

fix some known issues:

1. typescript plugin: fixed incorrect ScriptInfo modification for js/ts files when refreshing diagnostics

# 2026-04-02

> packages version: vscode-extension@1.0.3

fix some known issues:

1. vscode extension: completed compatibility adaptation for the refactored qingkuai compiler workflow
2. vscode extension: improved tsserver / typescript-plugin activation flow in qingkuai workspaces
3. language server: fixed formatter runtime plugin resolution to ensure QingKuai files can be formatted correctly

# 2026-03-04

> packages version: qingkuai@1.0.54, language-service@1.0.10

major update:

1. completed compatibility adaptation for the refactored qingkuai compiler
2. synchronized language-service parsing/compile bridge behavior with new compiler outputs
3. updated vscode-extension and typescript-plugin integration points to match the new compiler workflow

# 2025-11-24

> packages version: qingkuai@1.0.52

fix some known issues:

1. language service (caused by qingkuai compiler): the source index of the value of #key directive is not recorded in check mode, see: [Commit 3c4a39b](https://github.com/qingkuai-js/qingkuai/commit/3c4a39b4de179995c7cd89b1242d1a34a5bfb9c0)

# 2025-06-04

> packages version: vscode-extension@1.0.2, language-service@1.0.8

fix some known issues:

1. language service: do not give completion suggestions when the trigger character is value end wrapper char
2. language service: auto insert end tag when parent node has the same tag and does not has the matched end tag(recursive)
3. language service (caused by qingkuai compiler): incorrect event name to extract type, see: [Commit 2ecbcd9](https://github.com/qingkuai-js/qingkuai/commit/2ecbcd943c0de5a413c92270907ef4ad684f49cb)
4. language service: It is unreliable to determine whether an attribute is of Boolean type merely by relying on the description data of the attribute. An additional fixed record mechanism is added.

# 2025-05-30

> packages version: vscode-extension@1.0.1

fix some known issues:

1. language service (caused by qingkuai compiler): incorrect intermidiate code of inline event argument name: $arg, see: [Commit a195f48](https://github.com/qingkuai-js/qingkuai/commit/a195f4875d82bcb91c60955d7401005b610e234b)

# 2025-05-28

> packages version: vscode-extension@1.0.0

complete the development of the basic functions
