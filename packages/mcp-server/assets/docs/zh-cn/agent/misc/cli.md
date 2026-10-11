---
description: "Qingkuai 命令行工具：init 初始化、dev/build/preview 开发与构建、check 类型检查、format 格式化、build-types 声明生成，以及 vite/prettier/typescript 的类型重导出。"
keywords: ["cli", "qingkuai init", "check", "type check", "format", "build", "dev", "build-types", "命令行"]
---

# 命令行工具

`@qingkuai/cli` 提供 `qingkuai` 命令，全局安装后可直接使用（`npm install -g @qingkuai/cli`，`qingkuai -v` 验证）。脚手架生成的项目已在 package.json scripts 中映射各命令。每个命令都支持 `--help`（`-h`）查看完整选项。

## 命令

| 命令 | 用途 | 关键选项 |
|---|---|---|
| `qingkuai init <dir>` | 初始化项目；`init .` 在已有目录初始化 | `--ts`（TypeScript 模板）、`--force`（允许写入非空目录） |
| `qingkuai dev` | 启动开发服务器（HMR） | `--port`、`--open`、`--config`、`--mode` |
| `qingkuai build` | 构建应用（`index.html` 为入口）；传入组件文件进入库模式 | `--out/-o`、`--minify`、`--sourcemap`；库模式加 `--format`（es/cjs/umd/iife）与 `--name` |
| `qingkuai preview` | 本地预览构建产物（需先 build） | `--port`、`--open` |
| `qingkuai check <files...>` | 语法检查；加 `--types` 执行类型检查 | `--types`、`--project`、`--strict`、`--allow-js` |
| `qingkuai format <files...>` | Prettier 格式化（自动加载 qingkuai 插件） | `--write`（写回）、`--check`（仅检查） |
| `qingkuai build-types <files...>` | 生成 `.d.ts` 声明文件（库类型出口） | `--out/-o`、`--project` |

## 规则

1. 诊断与类型检查用 `qingkuai check src --types`：存在错误时以非零退出码结束，可直接用于脚本与 CI 判断。
2. 格式化 .qk 文件用 `qingkuai format src --write`；仅检测不写回用 `--check`。
3. 库模式构建组件后，用 `qingkuai build-types` 生成声明文件，再以 api-extractor 或 rollup-plugin-dts 捆绑为单一类型入口。
4. 上游工具类型经 CLI 重导出：vite 配置从 `@qingkuai/cli/vite` 导入 `defineConfig`，prettier 配置类型从 `@qingkuai/cli/prettier` 导入 `Config`（含 qingkuai 专属格式化选项）；不要直接 `import "vite"`，项目依赖中没有它。
5. vite 编译插件由 CLI 自动注入配置，无需手动添加。
6. CLI 会校验自身与项目内 qingkuai 运行时的版本兼容性（peer 约定 ~lockstep），不匹配时输出警告。

## 参见

- [安装](docs://zh-cn/agent/getting-started/install.md)
- [配置文件](docs://zh-cn/agent/misc/config-files.md)
