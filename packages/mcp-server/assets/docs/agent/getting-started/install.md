---
description: "Qingkuai installation: scaffold projects with create-qingkuai (npm/pnpm/yarn), the -ts TypeScript option, and the dev-server startup commands."
keywords: ["install", "create-qingkuai", "scaffold", "dev server", "安装", "脚手架"]
---

# Installation

Quick try: the online playground at `https://try.qingkuai.dev`. Full development: scaffold a local project with `create-qingkuai`.

## Commands

| Step | npm | pnpm | yarn |
|---|---|---|---|
| Create project | `npm create qingkuai -- my-app` | `pnpm create qingkuai@latest my-app` | `yarn dlx create-qingkuai@latest my-app` |
| TypeScript variant | append `-ts` (e.g. `npm create qingkuai -- my-app -ts`) | same | same |
| Install + dev server | `npm install && npm run dev` | `pnpm install && pnpm run dev` | `yarn && yarn dev` |

## Rules

1. Never invent install commands — these are the authoritative scaffold commands.
2. Add the `-ts` option to scaffold a TypeScript project.
3. After scaffolding, run the install + dev commands inside the created project directory.

## See also

- [Framework Introduction](docs://agent/getting-started/introduction.md)
- [Configuration Files](docs://agent/misc/config-files.md)
