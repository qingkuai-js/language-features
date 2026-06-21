# Installation

If you just want a quick try, you can start with the [online playground](https://try.qingkuai.dev).

For the full development experience, creating a local project is recommended. With [create-qingkuai](https://www.npmjs.com/package/create-qingkuai), you can initialize a project quickly by running one of the following commands in your terminal:

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

If you want to create a TypeScript version, just add the `-ts` option:

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

After the project is created, enter the project directory, install dependencies, and start the local development server:

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
