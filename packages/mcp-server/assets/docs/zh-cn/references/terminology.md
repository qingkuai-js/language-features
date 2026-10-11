# 术语参考

为了帮助你更高效地理解和使用 Qingkuai，本节汇总了文档中的常见术语，并给出简短说明。无论你是刚接触该框架，还是正在深入源码，都可以通过本节快速厘清名词含义，减少理解偏差。

> [!TIP]
> 本节主要用于统一术语理解与表达方式，解释以文档中的常见语境为准。

---

## 组件文件

组件文件是指以 `.qk` 为扩展名的文件，每个组件文件都表示一个组件声明。

参考：[语法介绍](docs://zh-cn/getting-started/introduction.md#简介)、[组件基础](docs://zh-cn/components/basic.md)

---

## 组件实例

组件实例是组件文件编译后在运行时创建的对象，承载组件导出的成员与内部状态。在父组件中，可通过组件标签上的 `&handle` 引用属性获取子组件的实例，并借此访问其导出的成员；在组件文件内部，可通过内建标识符 `instance` 访问当前组件自身的实例；同时，它也是从 `qingkuai` 运行时包导入的监视器、副作用与生命周期方法的绑定参数。

参考：[成员导出](docs://zh-cn/components/exports.md)、[组件引用属性](docs://zh-cn/components/attributes.md#引用属性)

---

## 事件

事件是指以 `@` 前缀声明的事件属性，用于在模板中绑定交互逻辑，或向组件外部暴露可调用的回调。

参考：[事件处理](docs://zh-cn/basic/event-handling.md)、[组件事件](docs://zh-cn/components/attributes.md#事件)

---

## 静态属性

静态属性是指在模板中声明时不依赖插值表达式，其值为固定的属性，通常用于绑定纯字符串数据。

参考：[静态属性](docs://zh-cn/components/attributes.md#静态属性)

---

## 动态属性

动态属性是指以 `!` 前缀声明、其值由插值表达式计算得到的属性，适用于绑定布尔值、对象等非纯字符串数据。

参考：[动态属性](docs://zh-cn/basic/interpolation.md#动态属性)

---

## 引用属性

引用属性是指以 `&` 前缀声明的可写属性通道。它不仅可用于组件标签，也可用于特定原生 HTML 标签（如 `input`、`textarea`、`select` 等）来建立值同步或引用传递。在组件内部，通常通过 `refs` 访问并更新这类数据。

参考：[引用属性](docs://zh-cn/basic/reference-attributes.md)、[表单输入处理](docs://zh-cn/basic/forms.md)、[组件属性](docs://zh-cn/components/attributes.md#引用属性)

---

## 响应式与响应性

这三个术语相关但侧重点不同，文档中可按下面方式理解：

- 响应式：一种能力或机制，表示值变化可被追踪并触发依赖更新。
- 响应性：对该能力本身的抽象描述，常用于讨论系统行为或设计特性。
- 响应式值：具备响应式能力的具体数据单元（如由编译器推导或通过相关 API 创建的值）。

参考：[响应性](docs://zh-cn/basic/reactivity.md)

---

## 监视器

监视器是指对响应式值变化进行监听并执行回调的机制，常用于副作用控制、状态对比和清理逻辑。

参考：[监视器](docs://zh-cn/basic/watchers-and-side-effects.md#监视器)

---

## 副作用

副作用是指依赖响应式状态并在其变化后执行的逻辑，常见于 DOM 交互、异步请求和外部系统同步。

参考：[监视器与副作用](docs://zh-cn/basic/watchers-and-side-effects.md#副作用)、[外部注册](docs://zh-cn/basic/watchers-and-side-effects.md#外部注册)

---

## 全局监视器

全局监视器是指未与任何组件实例绑定、需要手动管理生命周期的监视器。它通过向从 `qingkuai` 运行时包导入的监视器 API 传入 `null` 作为绑定参数创建，不会随组件销毁自动清理，常用于注册全局的响应式逻辑，如全局状态管理等场景。

参考：[监视器](docs://zh-cn/basic/watchers-and-side-effects.md#监视器)、[外部注册](docs://zh-cn/basic/watchers-and-side-effects.md#外部注册)

---

## 全局副作用

全局副作用是指未与任何组件实例绑定、需要手动管理生命周期的副作用。它通过向从 `qingkuai` 运行时包导入的副作用 API 传入 `null` 作为绑定参数创建，不会随组件销毁自动清理，常用于注册全局的响应式逻辑，如全局事件监听等场景。

参考：[副作用](docs://zh-cn/basic/watchers-and-side-effects.md#副作用)、[外部注册](docs://zh-cn/basic/watchers-and-side-effects.md#外部注册)

---

## 作用域

作用域表示某段模板或脚本中可访问标识符的范围，尤其在插槽和指令上下文中会影响变量可见性。

参考：[插槽](docs://zh-cn/components/slots.md#作用域)

---

## qk:spread

`qk:spread` 是 Qingkuai 的内置元素，常作为指令的虚拟挂载点；其本身不会渲染为真实 DOM 元素。

参考：[内置元素](docs://zh-cn/misc/builtin-elements.md)

---

## 运行时包

运行时包是指以 `qingkuai` 为入口的 [npm](https://www.npmjs.com) 包，导出组件生命周期、上下文、监视器与副作用、性能优化及状态转换等 API。在组件文件内部，多数 API 以[内建方法](#内建方法)的形式直接可用；在组件文件之外使用时，则需从运行时包导入，其中需要实例绑定的 API（如生命周期、监视器与副作用）会以[组件实例](#组件实例)作为第一个绑定参数。

参考：[API 参考](docs://zh-cn/references/api.md#运行时包)

---

## 编译器包

编译器包是指以 `qingkuai/compiler` 为入口的 [npm](https://www.npmjs.com) 包，用于解析与编译组件源码，主要被构建工具、语言服务和插件生态调用，业务代码通常无需直接依赖。

参考：[API 参考](docs://zh-cn/references/api.md#编译器包)

---

## props

`props` 是内建标识符，用于在组件内部读取外部传入的普通属性与事件属性。

参考：[组件属性](docs://zh-cn/components/attributes.md)、[内建标识符](docs://zh-cn/references/intrinsics.md)

---

## refs

`refs` 是内建标识符，用于在组件内部访问引用属性并执行可写更新。

参考：[组件属性](docs://zh-cn/components/attributes.md#引用属性)、[内建标识符](docs://zh-cn/references/intrinsics.md)

---

## contexts

`contexts` 是内建标识符，用于在组件内部读取上下文数据，数据通过组件内建或从运行时包导入的 `setContext` 系列 API 写入。

参考：[上下文](docs://zh-cn/components/contexts.md)、[内建标识符](docs://zh-cn/references/intrinsics.md)、[API 参考](docs://zh-cn/references/api.md)

---

## instance

`instance` 是内建标识符，指向当前组件自身的实例，主要用途是传递给外部逻辑，供外部模块调用需要实例绑定的运行时 API 时作为参数传入。

参考：[内建标识符 instance](docs://zh-cn/references/intrinsics.md#instance)

---

## 插值属性

插值属性是对一组特殊属性的统称，包括 `指令`、`动态属性`、`引用属性` 和 `事件`。

参考：[指令](docs://zh-cn/basic/compilation-directives.md)、[动态属性](docs://zh-cn/basic/interpolation.md#动态属性)、[引用属性](docs://zh-cn/basic/reference-attributes.md)、[事件处理](docs://zh-cn/basic/event-handling.md)、[组件属性](docs://zh-cn/components/attributes.md)

---

## 插值块

插值块是指模板中所有使用一对花括号包裹、用于嵌入 JS/TS 表达式的位置。它既包括 [插值属性](#插值属性) 的值部分，也包括 [文本插值](docs://zh-cn/basic/interpolation.md#文本插值) 部分。插值块默认具有响应性，可用内建方法 `raw` 或 `noTracking` 运行时 API 进行[非响应式读取](docs://zh-cn/basic/reactivity.md#非响应式读取)。

---

## 嵌入脚本块

嵌入脚本块是由 `lang-js` 或 `lang-ts` 标签包裹的区域，用于编写会被编译器处理的脚本内容。

参考：[语法介绍](docs://zh-cn/getting-started/introduction.md#简介)、[语法设计](docs://zh-cn/getting-started/introduction.md#语法设计)

---

## 嵌入样式块

嵌入样式块是指在组件文件中使用 `lang-css`、`lang-scss`、`lang-sass`、`lang-less`、`lang-stylus`、`lang-postcss` 标签包裹的区域，用于编写会被编译器处理的样式内容。该标签支持静态 `src` 属性引用外部样式文件，也支持布尔 `global` 属性声明全局样式块。

参考：[语法介绍](docs://zh-cn/getting-started/introduction.md#简介)、[样式表](docs://zh-cn/components/stylesheets.md)

---

## 嵌入语言标签

嵌入语言标签是指 `lang-js`、`lang-ts`、`lang-css`、`lang-scss`、`lang-sass`、`lang-less`、`lang-stylus`、`lang-postcss` 这 8 个标签，用于嵌入需要编译的脚本与样式内容。其中样式标签支持 `src`、`global` 等静态属性。

参考：[语法介绍](docs://zh-cn/getting-started/introduction.md#简介)、[样式表](docs://zh-cn/components/stylesheets.md)

---

## 插槽出口

插槽出口是指组件内部通过 `slot` 标签声明的占位位置，用于接收外部传入的插槽内容。

参考：[插槽](docs://zh-cn/components/slots.md)

---

## 插槽内容

插槽内容是指组件使用方传入的子内容，它会被渲染到对应的[插槽出口](#插槽出口)位置。

参考：[插槽](docs://zh-cn/components/slots.md)

---

## 内建标识符

内建标识符是指在组件文件中无需声明、可被编译器直接识别并处理的保留标识符，主要包括对象类标识符和方法类标识符。

对象类标识符包括：`refs`、`props`、`slots`、`contexts`、`instance`。

方法类标识符：即[内建方法](#内建方法)

其中，`refs` 用于访问引用属性，`props` 用于访问普通属性与事件属性，`slots` 用于检查插槽是否传入内容，`contexts` 用于读取上下文数据，`instance` 用于访问当前组件自身的实例。

参考：[组件属性](docs://zh-cn/components/attributes.md)、[插槽](docs://zh-cn/components/slots.md)、[内建方法](#内建方法)、[内建标识符](docs://zh-cn/references/intrinsics.md)

---

## 内建方法

内建方法是内建标识符的一部分，指可直接在组件文件中使用的方法标识符，涵盖响应性标记、默认值声明、上下文写入、监视器与副作用注册以及生命周期等类别。它们本质是编译标记，会在编译阶段被转换为内部方法调用，并自动绑定到当前组件实例。

参考：[响应性声明](docs://zh-cn/basic/reactivity.md#响应性声明)、[监视器](docs://zh-cn/basic/watchers-and-side-effects.md#监视器)、[生命周期](docs://zh-cn/components/lifecycle.md)、[内建标识符](docs://zh-cn/references/intrinsics.md)
