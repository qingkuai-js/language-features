---
description: "Qingkuai installation: scaffold projects with create-qingkuai (npm/pnpm/yarn), the --ts TypeScript option, and the dev-server startup commands; with a globally installed qingkuai command you can init and run type checks directly."
keywords: ["install", "create-qingkuai", "scaffold", "dev server", "安装", "脚手架"]
---

# Installation

Quick try: the online playground at `https://try.qingkuai.dev`. Full development: scaffold a local project with `create-qingkuai`.

## Commands

| Step | npm | pnpm | yarn |
|---|---|---|---|
| Create project | `npm create qingkuai -- qingkuai-app` | `pnpm create qingkuai@latest qingkuai-app` | `yarn dlx create-qingkuai@latest qingkuai-app` |
| TypeScript variant | append `--ts` (e.g. `npm create qingkuai -- qingkuai-app --ts`) | same | same |
| Enter project directory | `cd qingkuai-app` | same | same |
| Install + dev server | `npm install && npm run dev` | `pnpm install && pnpm run dev` | `yarn && yarn dev` |

## Rules

1. Never invent install commands — these are the authoritative scaffold commands.
2. Add the `--ts` option to scaffold a TypeScript project.
3. After scaffolding, run the install + dev commands inside the created project directory.
4. If the user has the `qingkuai` command globally installed (and not very old), it can initialize the project directly: `qingkuai init qingkuai-app --ts`, equivalent to create-qingkuai.
5. The global CLI can also run type checking (`qingkuai check src --types`), formatting and builds; see [Command Line Tool](docs://agent/misc/cli.md).

## See also

- [Framework Introduction](docs://agent/getting-started/introduction.md)
- [Configuration Files](docs://agent/misc/config-files.md)
- [Command Line Tool](docs://agent/misc/cli.md)
