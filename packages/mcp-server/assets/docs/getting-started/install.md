# Installation

If you just want to quickly experience Qingkuai, you can first try the [online playground](https://try.qingkuai.dev).

To get the full development experience, you can create a project locally. With [create-qingkuai](https://www.npmjs.com/package/create-qingkuai), you can quickly initialize a project by simply running one of the following commands in your terminal:

|npm|pnpm|yarn|

```shell
➜ npm create qingkuai -- qingkuai-app
```

```shell
➜ pnpm create qingkuai@latest qingkuai-app
```

```shell
➜ yarn dlx create-qingkuai@latest qingkuai-app
```

If you want to create a TypeScript version, just add the `--ts` option:

|npm|pnpm|yarn|

```shell
➜ npm create qingkuai -- qingkuai-app --ts
```

```shell
➜ pnpm create qingkuai@latest qingkuai-app --ts
```

```shell
➜ yarn dlx create-qingkuai@latest qingkuai-app --ts
```

After the project is created, enter the project directory and install the dependencies, then start the development server locally:

```shell
cd qingkuai-app
```

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
