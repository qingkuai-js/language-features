# 安装

如果你只想快速体验 Qingkuai，可以先试试 [在线演练场](https://try.qingkuai.dev)。

我们更推荐在本地创建项目，以获得完整的开发体验。通过 [create-qingkuai](https://www.npmjs.com/package/create-qingkuai)，你可以快速初始化项目，只需在终端执行以下命令：

|npm|pnpm|yarn|

```shell
➜ npm create qingkuai -- my-app
```

```shell
➜ pnpm create qingkuai@latest my-app
```

```shell
➜ yarn dlx create-qingkuai@latest my-app
```

如果你希望创建 TypeScript 版本，只需添加 `-ts` 选项：

|npm|pnpm|yarn|

```shell
➜ npm create qingkuai -- my-app -ts
```

```shell
➜ pnpm create qingkuai@latest my-app -ts
```

```shell
➜ yarn dlx create-qingkuai@latest my-app -ts
```

项目创建完成后，进入项目目录并安装依赖，然后在本地启动开发服务器：

|npm|pnpm|yarn|

```shell
➜ npm install && npm run dev
```

```shell
➜ pnpm install && pnpm run dev
```

```shell
➜ yarn && yarn dev
```
