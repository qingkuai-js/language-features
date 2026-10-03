---
description: "Qingkuai command line tool: init scaffolding, dev/build/preview development and building, check type checking, format formatting, build-types declaration generation, and type re-exports of vite/prettier/typescript."
keywords: ["cli", "qingkuai init", "check", "type check", "format", "build", "dev", "build-types", "command line"]
---

# Command Line Tool

`@qingkuai/cli` provides the `qingkuai` command, usable directly after a global install (`npm install -g @qingkuai/cli`, verify with `qingkuai -v`). Scaffolded projects already map every command to package.json scripts. Every command supports `--help` (`-h`) for the full option list.

## Commands

| Command | Purpose | Key options |
|---|---|---|
| `qingkuai init <dir>` | Initialize a project; `init .` initializes an existing directory | `--ts` (TypeScript template), `--force` (allow writing into a non-empty directory) |
| `qingkuai dev` | Start the dev server (HMR) | `--port`, `--open`, `--config`, `--mode` |
| `qingkuai build` | Build the application (`index.html` as entry); passing a component file enters library mode | `--out/-o`, `--minify`, `--sourcemap`; library mode adds `--format` (es/cjs/umd/iife) and `--name` |
| `qingkuai preview` | Preview the build output locally (build first) | `--port`, `--open` |
| `qingkuai check <files...>` | Syntax checking; add `--types` for type checking | `--types`, `--project`, `--strict`, `--allow-js` |
| `qingkuai format <files...>` | Prettier formatting (loads the qingkuai plugin automatically) | `--write` (write back), `--check` (check only) |
| `qingkuai build-types <files...>` | Generate `.d.ts` declaration files (library type entry) | `--out/-o`, `--project` |

## Rules

1. For diagnostics and type checking use `qingkuai check src --types`: it exits with a non-zero code when errors exist, so scripts and CI can rely on it directly.
2. To format .qk files use `qingkuai format src --write`; use `--check` to detect without writing back.
3. After building a component in library mode, generate declarations with `qingkuai build-types`, then bundle them into a single type entry with api-extractor or rollup-plugin-dts.
4. Upstream tool types are re-exported through the CLI: import `defineConfig` from `@qingkuai/cli/vite` for the vite config, and `Config` from `@qingkuai/cli/prettier` for the prettier config type (including qingkuai-specific formatting options); never `import "vite"` directly — it is not among the project dependencies.
5. The vite compiler plugin is injected into the config by the CLI automatically; never add it manually.
6. The CLI checks version compatibility between itself and the qingkuai runtime in the project (peer convention ~lockstep) and warns on mismatch.

## See also

- [Installation](docs://agent/getting-started/install.md)
- [Configuration Files](docs://agent/misc/config-files.md)
