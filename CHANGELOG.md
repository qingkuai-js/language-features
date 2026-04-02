# 2026-04-02

> packages version: vscode-extension@1.0.3

fix some known issues:

1. vscode extension: completed compatibility adaptation for the refactored qingkuai compiler workflow
2. vscode extension: improved tsserver / typescript-plugin activation flow in qingkuai workspaces
3. language server: fixed formatter runtime plugin resolution to ensure QingKuai files can be formatted correctly

> packages version: qingkuai@1.0.54, language-service@1.0.10

major update:

1. completed compatibility adaptation for the refactored qingkuai compiler
2. synchronized language-service parsing/compile bridge behavior with new compiler outputs
3. updated vscode-extension and typescript-plugin integration points to match the new compiler workflow

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
