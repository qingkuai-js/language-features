# 性能优化

在构建现代 Web 应用时，性能始终是开发者关注的重点之一。无论是首次加载速度、响应式更新效率，还是组件渲染粒度，合理的优化手段都能带来更流畅的用户体验。通过减少不必要的依赖追踪、按需渲染、延迟更新以及原始值操作等方式，可以有效降低开销、提升整体运行效率，让应用在保持复杂功能的同时依然快速响应。

---

## 信号模式

默认配置下，被推导为响应式的标识符会具有[深度响应性](docs://zh-cn/basic/reactivity.md#响应性模式)：读取属性时会递归地将嵌套值包装为响应式代理，任何层级的修改都能触发更新。这带来了符合直觉的开发体验，但响应式系统本身也存在不可忽视的运行时开销。如果应用对运行时性能有极致要求，可以通过组合调整两个[运行配置](docs://zh-cn/misc/config-files.md#运行配置)项，将响应式带来的性能影响降到最低：

```json
{
    "reactivityMode": "shallow",
    "allowConstReactive": false
}
```

这两项配置的效果互为补充：[`allowConstReactive: false`](docs://zh-cn/misc/config-files.md#allowconstreactive) 让所有不可变绑定退出[响应性推导](docs://zh-cn/references/reactivity-infer-rules.md)，不再产生依赖收集与代理包装的开销；[`reactivityMode: "shallow"`](docs://zh-cn/misc/config-files.md#reactivitymode) 让可变状态仅保留[浅层响应性](docs://zh-cn/basic/reactivity.md#响应性模式)，属性读取时返回的就是原始值本身。

组合使用后，只有“在模板中被访问且在脚本中存在修改”的 `let`/`var` 顶层标识符才会被推导为响应式，且仅维护浅层响应性，其余标识符一律是没有额外开销的原始值。此时应用会进入一种类似于 `signal` 的响应式模式，与 [Solid](https://www.solidjs.com)、[Preact Signals](https://preactjs.com/guide/v10/signals/) 等框架的工作方式非常相似：每个响应式状态就是一个可变的顶层绑定，对它的重新赋值会精确触发依赖它的部分更新，既没有深层代理，也没有递归的依赖追踪，响应式带来的性能影响会非常低。但也因此，响应式更新只能通过对标识符本身赋值来触发：

```qk
<lang-js>
    let user = {
        stars: 0,
        name: "Qingkuai"
    }

    // 触发更新
    function addStar() {
        user = {
            ...user,
            stars: user.stars + 1
        }
    }

    // 只是一次普通的 JS 操作，不会触发更新
    function addStarSilently() {
        user.stars++
    }
</lang-js>

<p>{ user.name }: { user.stars }</p>
<button @click={addStar}>add star</button>
<button @click={addStarSilently}>add star silently</button>
```

> [!TIP]
> 在 [js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) 等框架性能对比测试中，各框架的成绩通常来自由框架作者或核心贡献者精心优化的版本——往往需要针对每一处状态更新仔细斟酌响应性标记的使用。而在 Qingkuai 中，只需上面两行配置，无需精心优化每一处响应性标记，就能获得接近极致的运行时性能。

---

## 摇树优化

使用 [create-qingkuai](https://www.npmjs.com/package/create-qingkuai) 创建的项目默认采用 [Vite](https://cn.vite.dev) 作为构建和打包工具，而 Vite 底层基于 [Rollup](https://cn.rollupjs.org)，它具备优秀的摇树优化（[Tree-shaking](https://developer.mozilla.org/zh-CN/docs/Glossary/Tree_shaking)）能力，这得益于 [import](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/import) 语法的静态导入特性。

在设计之初，Qingkuai 就充分考虑了 Tree-shaking 的优势。所有 API 乃至指令都支持摇树优化。比如，如果你在代码中未使用 `#for` 指令，那么与其相关的代码不会被打包进最终产物。其他指令和功能也遵循相同原则，从源头上避免无用代码引入，进一步优化构建性能与产物体积。

```qk
<!-- 除 #if 指令外的其他指令的运行时代码不会被打包到最终产物 -->
<div #if={visible}>...</div>
```

为了获得更好的 Tree-shaking 效果，建议在导入第三方库时尽量使用 ESM（ES Module）格式的版本。相比于 CommonJS，ESM 支持静态分析，使构建工具能够准确识别和移除未使用的模块代码，从而减小打包体积。例如，在使用一些既提供 CommonJS 又提供 ESM 的库时，应优先选择其 ESM 版本，这种导入方式将显著提升最终构建产物的精简度与执行性能：

```js
// 推荐：ESM 模块，Tree-shaking 友好，打包体积更小
import { debounce } from "lodash-es"

// 不推荐：CommonJS 模块，无法可靠地进行 Tree-shaking，可能引入整个 lodash
import { debounce } from "lodash"
```

> [!TIP]
> 在选择使用第三方库时，除了关注功能是否满足需求，还应关注其引入后对打包体积的影响。体积庞大的库可能会显著拉高页面首次加载时间，尤其在移动端环境中影响更为明显。你可以使用 [bundlejs](https://bundlejs.com) 这类工具对库进行评估，它可以直观显示引入某个包或某个导出成员后的实际体积。借助这些信息，可以在功能和体积之间做出更具性价比的选择，例如使用更轻量的替代库，或者仅引入所需的部分模块。

---

## 样式复用

当同一个通用样式文件在多个组件的作用域嵌入样式块中，通过 `src` 或 `@import` 被重复引入时，编译结果通常会生成多份等价样式规则副本（分别附加不同组件的作用域标识）。这会增加 CSS 体积并放大样式解析开销。

```qk
<!-- A.qk -->
<lang-css src="./common.css" />

<!-- B.qk -->
<lang-css>
    @import "./common.css";
</lang-css>
```

上面这种写法会让 `common.css` 在每个组件里都被单独作用域化一次：同一条原始规则会附加不同组件的作用域标识并生成多份副本。随着组件数量增加，这类重复规则会线性累积，直接推高 CSS 体积与浏览器样式匹配开销。对于跨组件复用的通用样式，建议优先采用以下方式：

- 将稳定的通用样式放到全局样式入口统一加载（如应用入口 CSS 或布局组件的全局样式）；
- 对确实需要在组件内声明、但不依赖作用域隔离的样式，使用 `global` 样式块或全局文件集中维护；
- 仅把与组件结构强耦合、必须依赖作用域隔离的规则保留在组件作用域样式中；

---

## 代码分割

代码分割（Code-splitting）是前端性能优化的重要手段，用于将应用拆分成多个按需加载的模块，从而加快首屏加载速度并减少资源浪费。像 Vite 和 Rollup 这样的构建工具会根据静态依赖分析和 [动态导入](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/import) 自动进行模块拆分，并支持手动配置分块策略（如将第三方库分离），从而提升加载效率和浏览器缓存利用率：

```js
// module.js及其依赖会被拆分到一个单独的文件中，
// 另外只有loadModule方法被调用时才会加载该模块
function loadModule() {
    return import("./module.js")
}
```

在多路由应用中，不应将所有路由组件打包进主应用，而应借助代码分割机制实现路由懒加载，以显著提升加载效率和用户体验。这正是我们之前介绍的 [异步组件](docs://zh-cn/components/async-components.md) 的核心作用：

```qk
<lang-js>
    const ComponentModule = import("./Component.qk")
</lang-js>

<qk:spread
    #await={ComponentModule}
    #then={{ default: Component }}
>
    <Component />
</qk:spread>
```

---
