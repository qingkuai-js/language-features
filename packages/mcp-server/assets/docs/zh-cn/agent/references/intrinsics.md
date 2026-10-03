---
description: "Qingkuai 内建标识符完整参考：props、refs、slots、contexts、instance、响应性标记、监视器/副作用家族、defaults 与上下文方法。"
keywords: ["built-in identifiers", "props", "refs", "slots", "contexts", "instance", "reactive", "watch", "effect", "标识符"]
---

# 内建标识符

内建标识符是组件文件内无需声明、可被编译器直接识别并处理的保留名称。它们主要用于访问组件属性、引用属性、插槽状态与上下文，以及调用编译器提供的内建方法。

## 数据访问标识符

| 标识符 | 含义 |
|---|---|
| `props` | 读取传入组件的普通属性与事件属性；属性是只读 getter |
| `refs` | 访问引用属性；可写，写入同步回父级数据（双向绑定） |
| `slots` | 判断插槽内容是否被传入；按插槽存在性调整渲染 |
| `contexts` | 读取上下文数据；读取沿原型链查找最近的值；本层键遮蔽继承键，且不影响父组件的值 |
| `instance` | 组件自身实例；外部模块调用实例绑定运行时 API（`setContext`、`watch` 等）时的绑定参数 |

## 响应性标记与状态

| 标识符 | 含义 |
|---|---|
| `reactive` | 将标识符标记为深响应式（`let`/`var`：自身及嵌套；`const`：递归其属性） |
| `shallow` | 将标识符标记为浅响应式（`let`/`var`：仅自身；`const`：仅一级属性） |
| `raw` | 将标识符标记为静态值；修改不触发页面更新；表达式传入 `raw` 可执行非响应式读取（暂停依赖追踪，且不计为模板中的访问） |
| `alias` | 为标识符创建响应性别名；简化复杂的读写表达式并保留响应性；也是响应式解构 `props`/`refs` 的方式 |
| `derived` | 创建自动追踪依赖的衍生响应式状态 |
| `derivedExp` | 简写：编译器将该表达式转换为标准 `derived` 声明 |

## 监视器

| 标识符 | 含义 |
|---|---|
| `watch` | 注册监视器；回调收到 `(pre, cur)`；普通时机（相对调度器的顺序不保证） |
| `preWatch` | 更新调度器之前、模板更新之前运行 |
| `postWatch` | 调度更新完成后运行 |
| `syncWatch` | 依赖值变化后立即同步运行，调度器之前 |
| `watchExp` / `preWatchExp` / `postWatchExp` / `syncWatchExp` | 简写：直接传表达式；编译器包装为 getter |

## 副作用

| 标识符 | 含义 |
|---|---|
| `effect` | 注册响应式副作用；回调内读取的响应式值被自动收集为依赖 |
| `preEffect` | 前置副作用：调度器与模板更新之前 |
| `postEffect` | 后置副作用：调度更新完成后 |
| `syncEffect` | 同步副作用：依赖值变化后立即 |

## 属性默认值与上下文

| 标识符 | 含义 |
|---|---|
| `defaults` | 通过 `{ props: {...}, refs: {...}, contexts: {...} }` 为可选属性定义默认值；给了默认值的键收窄为非可选 |
| `setContext` | 向当前组件上下文层写入数据（写入时的值快照）；本层同名键遮蔽继承键且不影响父组件的值，后代组件可经由 `contexts` 读取 |
| `setContextGetter` | 向上下文层写入 getter；后代读取时自动调用，实现响应式上下文 |
| `setContextExp` | 简写：表达式包装为 getter → `setContextGetter` |

## 规则

1. 以上监视器/副作用/上下文方法在组件文件内都是内建的：无需导入、绑定当前实例、销毁时自动清理。
2. 标记（`reactive`/`shallow`/`raw`）只在变量声明初始化器中有效。
3. 在组件文件内导入同名标识符是编译错误，运行时包的导入请起别名。
4. 组件文件之外，从 `qingkuai` 运行时包导入这些 API，并以组件实例（全局监视器/副作用传 `null`）为第一个参数。

## 参见

- [响应性](docs://zh-cn/agent/basic/reactivity.md)
- [监视器与副作用](docs://zh-cn/agent/basic/watchers-and-side-effects.md)
- [组件上下文](docs://zh-cn/agent/components/contexts.md)
- [运行时包 API](docs://zh-cn/agent/references/api.md)
