# 命令行工具

命令行工具（CLI）是在终端中通过文本命令与程序交互的方式。Qingkuai 提供了官方的命令行工具 `@qingkuai/cli`，安装后通过 qingkuai 命令调用，它支持的能力如下：

- `init`：在工作目录中初始化一个新的 Qingkuai 项目，支持 JavaScript 与 TypeScript 两种模板
- `dev`：启动开发服务器，在开发过程中提供即时热更新（HMR）
- `build`：将整个应用或组件库构建为可分发的产物
- `preview`：启动预览服务器，在本地预览构建产物
- `check`：对组件文件与 TypeScript 文件执行语法检查，并可选地进行类型检查
- `format`：基于 Prettier 格式化组件文件及其他支持的文件
- `build-types`：为组件与 TypeScript 文件生成 .d.ts 声明文件，用于库产物对外暴露类型

---

## 安装

通过包管理器全局安装 CLI：

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

安装完成后，可以通过查看版本号确认是否安装成功：

```shell
➜ qingkuai -v
```

看到类似如下的输出即表示安装成功：

```shell
Version 1.0.0
```

不确定某个命令的用法时，可以为任意命令添加 `--help`（`-h`）选项查看帮助：

> [!TIP]
> 例如 `qingkuai init --help` 可以查看 `init` 命令的完整用法，`qingkuai --help` 可以查看所有命令的概览。

---

## init

在工作目录中创建一个新的 Qingkuai 应用：

```shell
➜ qingkuai init qingkuai-app
```

如果要在已有目录中初始化，传入 `.` 即可：

```shell
➜ qingkuai init .
```

该命令的可用选项如下：

| 选项    | 描述                   | 默认值 |
| ------- | ---------------------- | ------ |
| --ts    | 使用 TypeScript 模板   | —      |
| --force | 允许写入非空的目标目录 | —      |

---

## dev

启动基于 vite 的开发服务器，提供即时热更新：

```shell
➜ qingkuai dev --port 5173 --open
```

服务器的行为可通过以下选项调整：

| 选项     | 描述                                          | 默认值      |
| -------- | --------------------------------------------- | ----------- |
| --config | 指定 vite 配置文件路径                        | —           |
| --mode   | 指定 .env.[mode] 文件的环境模式（如 staging） | development |
| --port   | 指定服务器端口                                | 5173        |
| --host   | 指定服务器主机                                | —           |
| --open   | 服务器启动时打开浏览器                        | —           |

---

## build

将应用或组件库构建为可分发的产物，直接执行时以 `index.html` 作为入口构建整个应用：

```shell
➜ qingkuai build
```

传入组件文件作为位置参数时进入库模式，通过 `--format` 指定产物格式，`--name` 用于指定 `umd`、`iife` 格式的全局变量名，缺省时取 `package.json` 中的 name 字段：

```shell
➜ qingkuai build src/components/Button.qk --format es,cjs,umd
➜ qingkuai build src/components/Button.qk --format iife --name MyButton
```

构建行为可通过以下选项调整：

| 选项        | 描述                                               | 默认值     |
| ----------- | -------------------------------------------------- | ---------- |
| --out, -o   | 指定构建产物输出目录                               | dist       |
| --config    | 指定 vite 配置文件路径                             | —          |
| --mode      | 指定 .env.[mode] 文件的环境模式（如 staging）      | production |
| --sourcemap | 生成 sourcemap 文件                                | false      |
| --minify    | 压缩构建产物                                       | true       |
| --format    | 库产物格式（逗号分隔），可选值：es、cjs、umd、iife | es         |
| --name      | umd、iife 格式的全局变量名                         | —          |
| --oneline   | 以单行格式输出诊断信息                             | —          |

---

## preview

通过 vite 的预览服务器本地预览 `build` 的产物，使用前需要先完成构建，产物目录不存在时会报告错误：

```shell
➜ qingkuai build && qingkuai preview --open
```

预览服务器的行为可通过以下选项调整：

| 选项     | 描述                                          | 默认值     |
| -------- | --------------------------------------------- | ---------- |
| --config | 指定 vite 配置文件路径                        | —          |
| --mode   | 指定 .env.[mode] 文件的环境模式（如 staging） | production |
| --port   | 指定预览服务器端口                            | 4173       |
| --host   | 指定预览服务器主机                            | —          |
| --open   | 服务器启动时打开浏览器                        | —          |

---

## check

对 Qingkuai 组件文件与 TypeScript 文件执行语法检查：

```shell
➜ qingkuai check src
```

添加 `--types` 选项时进一步执行类型检查：

```shell
➜ qingkuai check --types src
```

位置参数接受一个或多个文件或目录，存在错误时以非零退出码结束：

```shell
➜ qingkuai check --types src/components/Button.qk src/utils/*
```

该命令的可用选项如下：

| 选项                   | 描述                                                                         | 默认值   |
| ---------------------- | ---------------------------------------------------------------------------- | -------- |
| --types                | 执行类型检查                                                                 | —        |
| --oneline              | 以单行格式输出诊断信息                                                       | —        |
| --project              | 指定 tsconfig.json / jsconfig.json 路径                                      | —        |
| --strict               | 启用严格模式                                                                 | false    |
| --allow-js             | 允许处理 JS 文件                                                             | false    |
| --skip-lib-check       | 跳过库文件的类型检查                                                         | false    |
| --allow-const-reactive | 允许将常量声明标记为响应式                                                   | true     |
| --lib                  | 指定库类型定义（逗号分隔）                                                   | —        |
| --type-packages        | 指定 @types 包名（逗号分隔）                                                 | —        |
| --module-resolution    | 模块解析策略，可选值：classic、node、node16、nodenext、bundler               | nodenext |
| --jsx                  | JSX 处理模式，可选值：preserve、react、react-jsx、react-jsxdev、react-native | preserve |

---

## format

基于 [Prettier](https://prettier.io/) 与 [prettier-plugin-qingkuai](https://npmjs.org/package/prettier-plugin-qingkuai)，对组件文件及其他 Prettier 支持的文件进行格式化，默认将结果输出到标准输出：

```shell
➜ qingkuai format src
```

添加 `--write` 写回文件：

```shell
➜ qingkuai format src --write
```

添加 `--check` 仅检查是否存在待格式化的文件：

```shell
➜ qingkuai format src --check
```

CLI 标志的优先级高于配置文件，该命令的可用选项如下：

| 选项                          | 描述                                     | 默认值    |
| ----------------------------- | ---------------------------------------- | --------- |
| --check                       | 仅检查是否存在待格式化的文件，不写回     | —         |
| --write                       | 将格式化结果写回文件                     | —         |
| --print-width                 | 每行最大打印宽度                         | 80        |
| --tab-width                   | 缩进宽度                                 | 2         |
| --use-tabs                    | 使用制表符缩进                           | false     |
| --semi                        | 在语句末尾添加分号                       | true      |
| --single-quote                | 使用单引号替代双引号                     | false     |
| --trailing-comma              | 尾随逗号风格                             | all       |
| --bracket-spacing             | 对象字面量中的空格                       | true      |
| --arrow-parens                | 箭头函数单个参数的括号                   | always    |
| --end-of-line                 | 换行符                                   | lf        |
| --quote-props                 | 对象属性的引号                           | as-needed |
| --single-attribute-per-line   | 每个属性独占一行                         | false     |
| --prose-wrap                  | Markdown 文本的换行方式                  | preserve  |
| --html-whitespace-sensitivity | HTML 空白敏感度                          | css       |
| --space-around-interpolation  | 在插值块两侧插入空格                     | true      |
| --self-close-empty-slot       | 将空的 slot 标签转为自闭合形式           | true      |
| --component-tag-format        | 组件标签的命名风格，可选值：camel、kebab | kebab     |
| --component-attribute-format  | 组件属性的命名风格，可选值：camel、kebab | kebab     |

---

## build-types

为 TypeScript 与 Qingkuai 组件文件生成对应的 `.d.ts` 声明文件，构建库产物时用于对外暴露类型：

```shell
➜ qingkuai build-types src --out dist/types
```

> [!TIP]
> 生成的声明文件与源文件结构相同，通常作为中间产物输出到临时目录，再搭配 [api-extractor](https://api-extractor.com/) 或 [rollup-plugin-dts](https://github.com/Swatinem/rollup-plugin-dts) 捆绑为单一的声明入口文件。

该命令的可用选项如下：

| 选项                | 描述                                                                         | 默认值             |
| ------------------- | ---------------------------------------------------------------------------- | ------------------ |
| --out, -o           | 指定声明文件的输出目录                                                       | 遵循 tsconfig 配置 |
| --project           | 指定 tsconfig.json / jsconfig.json 路径                                      | —                  |
| --allow-js          | 允许处理 JS 文件                                                             | false              |
| --skip-lib-check    | 跳过库文件的类型检查                                                         | false              |
| --lib               | 指定库类型定义（逗号分隔）                                                   | —                  |
| --type-packages     | 指定 @types 包名（逗号分隔）                                                 | —                  |
| --module-resolution | 模块解析策略，可选值：classic、node、node16、nodenext、bundler               | nodenext           |
| --jsx               | JSX 处理模式，可选值：preserve、react、react-jsx、react-jsxdev、react-native | preserve           |
| --oneline           | 以单行格式输出诊断信息                                                       | —                  |

---

## 使用上游工具

由于项目的依赖中不直接包含 [Vite](https://vitejs.dev/) 与 [Prettier](https://prettier.io/)，命令行工具包重导出了这些上游工具的类型定义与方法，编写配置文件时从命令行工具包导入即可，无需将它们添加为项目的依赖，这样可以避免版本冲突，并且在 CLI 升级时自动获得上游工具的更新：

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
> 命令行工具会自动注入 [vite-plugin-qingkuai](https://github.com/QingKuai/vite-plugin-qingkuai) 插件，所以无需在配置文件中手动添加。

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

其中重导出的 [Typescript](https://www.typescriptlang.org/) 通常不面向配置文件，而是用于构建脚本等场景，例如，下面的脚本从 `tsconfig.json` 中解析出项目覆盖的全部源文件，可作为自定义构建流程的基础：

```js
// scripts/list-files.mjs
import ts from "@qingkuai/cli/typescript"

const configFile = ts.readConfigFile("tsconfig.json", ts.sys.readFile)
const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    process.cwd()
)

// 输出 tsconfig 覆盖的全部源文件
console.log(parsed.fileNames)
```
