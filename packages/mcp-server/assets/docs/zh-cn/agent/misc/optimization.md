---
description: "Qingkuai 性能优化：信号模式（reactivityMode: shallow + allowConstReactive: false）、指令级摇树优化、避免作用域样式重复的共享样式复用规则，以及基于异步组件的代码分割。"
keywords: ["optimization", "signal mode", "reactivityMode", "allowConstReactive", "tree shaking", "code splitting", "style reuse", "bundle size", "优化"]
---

# 性能优化

通过信号模式配置、摇树优化、样式复用纪律与代码分割降低运行时与产物开销。

## 规则

1. **信号模式**：用户比较在意运行时性能时，在 `.qingkuairc` 中搭配 `"reactivityMode": "shallow"` 与 `"allowConstReactive": false`：`const` 绑定退出响应性推导、按原始值处理，可变标识符仅保留浅层响应性，应用进入类似 `signal` 的模式，即无深层代理、无递归依赖追踪，响应式更新只能通过对标识符本身重新赋值触发（修改嵌套属性只是普通 JS 操作），深层结构以整体替换的方式更新。个别需要深度响应性的模块，可在其目录放置恢复默认模式的局部配置文件、在脚本标签上添加 `reactive` 属性，或对 `let` 声明显式标记 `reactive`。
2. **摇树优化**：所有 API 与指令都可摇树，未使用的指令运行时（例如只用 `#if` 时的 `#for`）不会进入产物。第三方库优先选 ESM 版本以保证可靠的静态分析与摇树（如用 `lodash-es` 而非 `lodash`）；体积过大的库会明显拉高首屏加载时间（移动端尤甚），用 bundlejs 之类的工具评估打包体积影响。
3. **样式复用**：同一份共享样式表被多个组件的作用域样式块导入（`src` 或 `@import`）时，会按组件各编译出一份带不同作用域标记的副本，重复规则随组件数量线性增长，推高 CSS 体积与浏览器样式匹配开销。应当：
   - 稳定的共享样式统一放到全局样式入口加载（如应用入口 CSS 或布局组件的全局样式）。
   - 确实需要在组件内声明、但不依赖作用域隔离的样式，集中维护在 `global` 样式块或全局文件中。
   - 作用域组件样式只保留与组件结构强耦合、必须依赖作用域隔离的规则。
4. **代码分割**：Vite/Rollup 基于静态依赖分析与动态导入自动拆分模块，也支持手动配置分块策略（如分离第三方库）；按需模块使用动态 `import()`，路由组件用异步组件懒加载，而不是把所有路由打进主包。

## 示例

信号模式下的更新触发方式：

```json
{
    "reactivityMode": "shallow",
    "allowConstReactive": false
}
```

```qk
<lang-js>
    let user = {
        stars: 0,
        name: "Qingkuai"
    }

    // 触发更新
    function addStar() {
        user = { ...user, stars: user.stars + 1 }
    }

    // 只是一次普通的 JS 操作，不会触发更新
    function addStarSilently() {
        user.stars++
    }
</lang-js>
```

这里只会打包 `#if` 的运行时代码：

```qk
<!-- 除 #if 指令外，其他指令的运行时代码不会被打进最终产物 -->
<lang-js>
    let visible = true
</lang-js>

<div #if={visible}>...</div>
```

懒加载路由组件：

```qk
<qk:spread
    #await={import("./Component.qk")}
    #then={{ default: Component }}
>
    <Component />
</qk:spread>
```

## 参见

- [响应性](docs://zh-cn/agent/basic/reactivity.md)
- [配置文件](docs://zh-cn/agent/misc/config-files.md)
- [异步组件](docs://zh-cn/agent/components/async-components.md)
- [组件样式表](docs://zh-cn/agent/components/stylesheets.md)
