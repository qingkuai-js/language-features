# Command Line Tool

A command line tool (CLI) is a way of interacting with a program through text commands in a terminal. Qingkuai provides an official command line tool `@qingkuai/cli`. After installation it is invoked through the qingkuai command, and its capabilities are as follows:

- `init`: initialize a new Qingkuai project in the working directory, with JavaScript and TypeScript templates
- `dev`: start the dev server with instant hot module replacement (HMR)
- `build`: build the whole application or a component library into distributable output
- `preview`: start the preview server to preview the build output locally
- `check`: run syntax checks on component files and TypeScript files, with optional type checking
- `format`: format component files and other files supported by Prettier
- `build-types`: generate .d.ts declaration files for components and TypeScript files, used to expose types for library output

---

## Installation

Install the CLI globally with a package manager:

|npm|pnpm|yarn|

```shell
➜ npm install -g @qingkuai/cli
```

```shell
➜ pnpm add -g @qingkuai/cli
```

```shell
➜ yarn global add @qingkuai/cli
```

After installation, you can verify it by checking the version number:

```shell
➜ qingkuai -v
```

Output similar to the following means the installation succeeded:

```shell
Version 1.0.0
```

When you are unsure how a command works, add the `--help` (`-h`) option to any command to view its help:

> [!TIP]
> For example, `qingkuai init --help` shows the complete usage of the `init` command, and `qingkuai --help` shows an overview of all commands.

---

## init

Create a new Qingkuai application in the working directory:

```shell
➜ qingkuai init qingkuai-app
```

To initialize in an existing directory, pass `.`:

```shell
➜ qingkuai init .
```

The available options for this command:

| Option | Description | Default |
| --- | --- | --- |
| --ts | Use the TypeScript template | — |
| --force | Allow writing into a non-empty target directory | — |

---

## dev

Start the vite-based dev server with instant hot module replacement:

```shell
➜ qingkuai dev --port 5173 --open
```

The server's behavior can be adjusted with the following options:

| Option | Description | Default |
| --- | --- | --- |
| --config | Specify the vite config file path | — |
| --mode | Set the environment mode for .env.[mode] files (e.g. staging) | development |
| --port | Set the server port | 5173 |
| --host | Set the server host | — |
| --open | Open the browser when the server starts | — |

---

## build

Build the application or a component library into distributable output; running it directly builds the whole application with `index.html` as the entry:

```shell
➜ qingkuai build
```

Passing a component file as a positional argument enters library mode, where `--format` sets the output format and `--name` sets the global variable name for the `umd` and `iife` formats, falling back to the name field in `package.json`:

```shell
➜ qingkuai build src/components/Button.qk --format es,cjs,umd
➜ qingkuai build src/components/Button.qk --format iife --name MyButton
```

The build behavior can be adjusted with the following options:

| Option | Description | Default |
| --- | --- | --- |
| --out, -o | Set the build output directory | dist |
| --config | Specify the vite config file path | — |
| --mode | Set the environment mode for .env.[mode] files (e.g. staging) | production |
| --sourcemap | Generate sourcemap files | false |
| --minify | Minify the build output | true |
| --format | Library output format (comma-separated), one of: es, cjs, umd, iife | es |
| --name | Global variable name for the umd and iife formats | — |
| --oneline | Output diagnostics in a single-line format | — |

---

## preview

Preview the output of `build` locally through vite's preview server; the build must be completed first, and an error is reported when the output directory does not exist:

```shell
➜ qingkuai build && qingkuai preview --open
```

The preview server's behavior can be adjusted with the following options:

| Option | Description | Default |
| --- | --- | --- |
| --config | Specify the vite config file path | — |
| --mode | Set the environment mode for .env.[mode] files (e.g. staging) | production |
| --port | Set the preview server port | 4173 |
| --host | Set the preview server host | — |
| --open | Open the browser when the server starts | — |

---

## check

Run syntax checks on Qingkuai component files and TypeScript files:

```shell
➜ qingkuai check src
```

Adding the `--types` option additionally runs type checking:

```shell
➜ qingkuai check --types src
```

Positional arguments accept one or more files or directories, and the process exits with a non-zero code when errors exist:

```shell
➜ qingkuai check --types src/components/Button.qk src/utils/*
```

The available options for this command:

| Option | Description | Default |
| --- | --- | --- |
| --types | Run type checking | — |
| --oneline | Output diagnostics in a single-line format | — |
| --project | Specify the tsconfig.json / jsconfig.json path | — |
| --strict | Enable strict mode | false |
| --allow-js | Allow processing JS files | false |
| --skip-lib-check | Skip type checking of library files | false |
| --allow-const-reactive | Allow const declarations to be marked as reactive | true |
| --lib | Specify library type definitions (comma-separated) | — |
| --type-packages | Specify @types package names (comma-separated) | — |
| --module-resolution | Module resolution strategy, one of: classic, node, node16, nodenext, bundler | nodenext |
| --jsx | JSX handling mode, one of: preserve, react, react-jsx, react-jsxdev, react-native | preserve |

---

## format

Based on [Prettier](https://prettier.io/) and [prettier-plugin-qingkuai](https://npmjs.org/package/prettier-plugin-qingkuai), formats component files and other files supported by Prettier, printing the result to standard output by default:

```shell
➜ qingkuai format src
```

Add `--write` to write the result back to the files:

```shell
➜ qingkuai format src --write
```

Add `--check` to only check whether there are files waiting to be formatted:

```shell
➜ qingkuai format src --check
```

CLI flags take priority over the configuration file; the available options for this command:

| Option | Description | Default |
| --- | --- | --- |
| --check | Only check whether there are files waiting to be formatted, without writing back | — |
| --write | Write the formatting result back to the files | — |
| --print-width | Maximum printed line width | 80 |
| --tab-width | Indentation width | 2 |
| --use-tabs | Indent with tabs | false |
| --semi | Add semicolons at the end of statements | true |
| --single-quote | Use single quotes instead of double quotes | false |
| --trailing-comma | Trailing comma style | all |
| --bracket-spacing | Spaces inside object literals | true |
| --arrow-parens | Parentheses around a single arrow function parameter | always |
| --end-of-line | End of line character | lf |
| --quote-props | Quoting style for object properties | as-needed |
| --single-attribute-per-line | One attribute per line | false |
| --prose-wrap | Line wrapping of Markdown prose | preserve |
| --html-whitespace-sensitivity | HTML whitespace sensitivity | css |
| --space-around-interpolation | Insert spaces around interpolation blocks | true |
| --self-close-empty-slot | Convert empty slot tags to self-closing form | true |
| --component-tag-format | Naming style of component tags, one of: camel, kebab | kebab |
| --component-attribute-format | Naming style of component attributes, one of: camel, kebab | kebab |

---

## build-types

Generate the corresponding `.d.ts` declaration files for TypeScript and Qingkuai component files, used to expose types when building library output:

```shell
➜ qingkuai build-types src --out dist/types
```

> [!TIP]
> The generated declaration files mirror the source file structure and are usually emitted into a temporary directory as intermediate output, then bundled into a single declaration entry file with [api-extractor](https://api-extractor.com/) or [rollup-plugin-dts](https://github.com/Swatinem/rollup-plugin-dts).

The available options for this command:

| Option | Description | Default |
| --- | --- | --- |
| --out, -o | Set the output directory for the declaration files | Follows tsconfig |
| --project | Specify the tsconfig.json / jsconfig.json path | — |
| --allow-js | Allow processing JS files | false |
| --skip-lib-check | Skip type checking of library files | false |
| --lib | Specify library type definitions (comma-separated) | — |
| --type-packages | Specify @types package names (comma-separated) | — |
| --module-resolution | Module resolution strategy, one of: classic, node, node16, nodenext, bundler | nodenext |
| --jsx | JSX handling mode, one of: preserve, react, react-jsx, react-jsxdev, react-native | preserve |
| --oneline | Output diagnostics in a single-line format | — |

---

## Using Upstream Tools

Since the project's dependencies do not directly include [Vite](https://vitejs.dev/) or [Prettier](https://prettier.io/), the CLI package re-exports the type definitions and methods of these upstream tools; when writing configuration files, import them from the CLI package instead of adding them as project dependencies — this avoids version conflicts and automatically picks up upstream tool updates when the CLI is upgraded:

```ts
// vite.config.ts
import { defineConfig } from "@qingkuai/cli/vite"

export default defineConfig({
    server: {
        port: 3000
    }
})
```

> [!TIP]
> The CLI automatically injects the [vite-plugin-qingkuai](https://github.com/QingKuai/vite-plugin-qingkuai) plugin, so there is no need to add it manually in the config file.

```ts
// prettier.config.ts
import type { Config } from "@qingkuai/cli/prettier"

const config: Config = {
    printWidth: 100,
    singleQuote: true,
    spaceAroundInterpolation: true
}

export default config
```

The re-exported [TypeScript](https://www.typescriptlang.org/) is usually not aimed at configuration files but at build scripts and similar scenarios. For example, the following script resolves all source files covered by `tsconfig.json` and can serve as the foundation of a custom build pipeline:

```js
// scripts/list-files.mjs
import ts from "@qingkuai/cli/typescript"

const configFile = ts.readConfigFile("tsconfig.json", ts.sys.readFile)
const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    process.cwd()
)

// Print all source files covered by the tsconfig
console.log(parsed.fileNames)
```
