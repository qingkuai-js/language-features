# 2026-08-05

> packages version: vscode-extension@1.0.30

features:

1. added inlay hint support for reactivity status and TypeScript script blocks ([3baaf44](https://github.com/qingkuai-js/language-tools/commit/3baaf44))
2. implemented `resolveFilePath` import path resolution ([5164c75](https://github.com/qingkuai-js/language-tools/commit/5164c75))
3. added `getIdentifierDescriptionsMap` function to extract identifier descriptions ([f9e8f7d](https://github.com/qingkuai-js/language-tools/commit/f9e8f7d))
4. added `selfCloseEmptySlot` prettier configuration option ([0607b6b](https://github.com/qingkuai-js/language-tools/commit/0607b6b))
5. added global attribute descriptions for embedded language tags ([b4c4b90](https://github.com/qingkuai-js/language-tools/commit/b4c4b90))
6. added `allowConstReactive` configuration option and updated related components and documentation ([a404d9f](https://github.com/qingkuai-js/language-tools/commit/a404d9f), [8c7b9d0](https://github.com/qingkuai-js/language-tools/commit/8c7b9d0))

fixes:

1. fixed `.qk` files not being recognized by the ts server and connection timeout on restart ([f4f50bf](https://github.com/qingkuai-js/language-tools/commit/f4f50bf))
2. fixed file count confusion caused by proxy applied before state initialization ([0e01b29](https://github.com/qingkuai-js/language-tools/commit/0e01b29))
3. forced close of warmup files and stopped related configuration file watchers ([489b86d](https://github.com/qingkuai-js/language-tools/commit/489b86d))
4. included `js/ts` configuration changes in config cache cleaning triggers ([cbd764b](https://github.com/qingkuai-js/language-tools/commit/cbd764b))
5. downgraded `prettier` to 3.5.3 ([d823cd2](https://github.com/qingkuai-js/language-tools/commit/d823cd2))
6. fixed `usage` string formatting and added `src` attribute description ([ee277d1](https://github.com/qingkuai-js/language-tools/commit/ee277d1))

refactor:

1. unified `qingkuai` config resolution with `extends` support ([4be2ca7](https://github.com/qingkuai-js/language-tools/commit/4be2ca7))
2. consolidated type re-exports into entry files ([291630e](https://github.com/qingkuai-js/language-tools/commit/291630e))
3. consolidated config cache cleaning and diagnostic refresh logic ([4087e70](https://github.com/qingkuai-js/language-tools/commit/4087e70))
4. consolidated disposable management and removed config watchers ([3df4746](https://github.com/qingkuai-js/language-tools/commit/3df4746))
5. migrated to `pnpm catalogs` for centralized dependency management ([aa068ec](https://github.com/qingkuai-js/language-tools/commit/aa068ec))
6. enhanced type confirmation and module resolution ([d7706af](https://github.com/qingkuai-js/language-tools/commit/d7706af))
7. improved component info extraction and module resolution ([64fb367](https://github.com/qingkuai-js/language-tools/commit/64fb367))
8. optimized definition retrieval logic and condition checks ([c56f50b](https://github.com/qingkuai-js/language-tools/commit/c56f50b))
9. renamed `hoverHintReactiveStatus` / `hoverTipReactiveStatus` config options for consistency ([a8adfd1](https://github.com/qingkuai-js/language-tools/commit/a8adfd1), [aa5946e](https://github.com/qingkuai-js/language-tools/commit/aa5946e))

others:

1. updated dependency versions and constrained `vscode-languageserver-types` < 3.18.0 ([e5e482b](https://github.com/qingkuai-js/language-tools/commit/e5e482b), [aa4de09](https://github.com/qingkuai-js/language-tools/commit/aa4de09))
2. added `.npmrc` to exclude links from lockfile and restored workspace links ([b4535fc](https://github.com/qingkuai-js/language-tools/commit/b4535fc), [6791a6a](https://github.com/qingkuai-js/language-tools/commit/6791a6a))
3. excluded `qingkuai-language-service` source files from the vscode package via `.vscodeignore` ([ddf5679](https://github.com/qingkuai-js/language-tools/commit/ddf5679))
4. renamed schema options to match implementation ([248d740](https://github.com/qingkuai-js/language-tools/commit/248d740))
5. updated `reactivity` and dynamic component documentation ([694bd76](https://github.com/qingkuai-js/language-tools/commit/694bd76))

# 2026-07-14

> packages version: vscode-extension@1.0.19

features:

1. added inlay hint support for compiler-inferred reactivity status of identifiers ([09cbbc7](https://github.com/qingkuai-js/language-tools/commit/09cbbc7), [dc6f83c](https://github.com/qingkuai-js/language-tools/commit/dc6f83c))

# 2026-07-06

> packages version: mcp-server@1.0.6, vscode-extension@1.0.18

fixes:

1. fixed MCP server crash when parsing docs without YAML front matter, and syntax check not returning error messages ([a70f12a](https://github.com/qingkuai-js/language-tools/commit/a70f12a))

# 2026-06-21

> packages version: vscode-extension@1.0.17, qingkuai@1.0.82, qingkuai-mcp-server@1.0.5

features and fixes:

1. removed invalid `#for` directive completion suggestions
2. added language feature implementation for the `#scope` directive
3. updated MCP server documentation files

# 2026-05-30

> packages version: vscode-extension@1.0.16, qingkuai@1.0.70, qingkuai-mcp-server@1.0.4

features and fixes:

1. adapted language features to Qingkuai's JS/TS parser migration to TypeScript
2. synchronized MCP server reference documentation content ([f596eae](https://github.com/qingkuai-js/language-tools/commit/f596eae))
3. fixed incorrect hover type information on component tags ([bcaea79](https://github.com/qingkuai-js/language-tools/commit/bcaea79))
4. improved extension initialization performance when reading workspace configuration ([1a88a26](https://github.com/qingkuai-js/language-tools/commit/1a88a26))

# 2026-05-19

> packages version: vscode-extension@1.0.14, qingkuai@1.0.67

features:

1. refactored `&dom` auto-completion to use `&handle` instead (supports completion on component tags)
2. added language features for component exports to keep `find definition`/`find references` behavior consistent with `esm` modules in `js/ts`

# 2026-05-04

> packages version: vscode-extension@1.0.13, qingkuai-mcp-server@1.0.3

features and fixes:

1. improved MCP server instruction-following behavior during project initialization
2. fixed formatter not working on Windows and an extension initialization error when a default formatter is configured

# 2026-04-28

> packages version: vscode-extension@1.0.11, qingkuai@1.0.65, qingkuai-mcp-server@1.0.2

features and fixes:

1. added the MCP server package
2. fixed incorrect component tag highlighting
3. fixed incorrect highlighting for `source.qk` code blocks in Markdown caused by `Vue` extension grammar injection

# 2026-04-07

> packages version: vscode-extension@1.0.8, language-service@1.0.17, qingkuai@1.0.59

refactor and fixes:

1. moved language-service type declarations into `qingkuai/language-service` instead of `typescript-plugin-qingkuai`
2. fixed incorrect parameter names in generated export results for JavaScript projects
3. fixed curly braces not being auto-inserted when a compile directive is followed by `=`
4. trigger completion suggestions for available slot names when typing `=` to complete a `#slot` directive value

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
