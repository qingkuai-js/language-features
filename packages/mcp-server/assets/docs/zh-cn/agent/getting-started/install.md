---
description: "Qingkuai 安装：使用 create-qingkuai 脚手架创建项目（npm/pnpm/yarn）、--ts TypeScript 选项以及本地开发服务器启动命令；已全局安装 qingkuai 命令时可直接 init 并执行类型检查。"
keywords: ["install", "create-qingkuai", "scaffold", "dev server", "安装", "脚手架"]
---

# 安装

快速体验：在线 Playground `https://try.qingkuai.dev`。完整开发体验：使用 `create-qingkuai` 脚手架在本地创建项目。

## 命令

| 步骤 | npm | pnpm | yarn |
|---|---|---|---|
| 创建项目 | `npm create qingkuai -- qingkuai-app` | `pnpm create qingkuai@latest qingkuai-app` | `yarn dlx create-qingkuai@latest qingkuai-app` |
| TypeScript 版本 | 追加 `--ts`（如 `npm create qingkuai -- qingkuai-app --ts`） | 同左 | 同左 |
| 进入项目目录 | `cd qingkuai-app` | 同左 | 同左 |
| 安装依赖并启动开发服务器 | `npm install && npm run dev` | `pnpm install && pnpm run dev` | `yarn && yarn dev` |

## 规则

1. 绝不发明安装命令，以上是权威的脚手架命令。
2. 追加 `--ts` 选项可创建 TypeScript 版本项目。
3. 脚手架创建完成后，进入项目目录执行安装与开发命令。
4. 若用户已全局安装 `qingkuai` 命令（版本不要太旧），可直接用它初始化项目：`qingkuai init qingkuai-app --ts`，效果与 create-qingkuai 一致。
5. 全局 CLI 还可执行类型检查（`qingkuai check src --types`）、格式化与构建，详见 [命令行工具](docs://zh-cn/agent/misc/cli.md)。

## 参见

- [框架简介](docs://zh-cn/agent/getting-started/introduction.md)
- [配置文件](docs://zh-cn/agent/misc/config-files.md)
- [命令行工具](docs://zh-cn/agent/misc/cli.md)
