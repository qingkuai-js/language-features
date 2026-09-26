# 内建标识符

内建标识符是指在组件文件中无需声明、可被编译器直接识别并处理的保留标识符。它们主要用于访问组件属性、引用属性、插槽状态与上下文，以及调用编译器提供的内建方法。

其中，以 `Exp` 为后缀的内建方法（`derivedExp`、`watchExp` 等）是相应 API 的表达式简写形式：编译器会将传入的表达式包装为 getter，等价于向对应方法传入等价的函数字面量。

---

## props

`props` 用于在组件内部读取外部传入的普通属性与事件属性。组件可以通过它访问父组件传递的数据和事件处理函数，从而实现组件间的通信与数据流动。

参考： [组件属性](docs://zh-cn/components/attributes.md)

---

## refs

`refs` 用于在组件内部访问引用属性并执行可写更新。组件可以通过它获取父组件传递的引用数据，并直接修改这些数据，以实现双向绑定或其他交互效果。

参考： [组件属性](docs://zh-cn/components/attributes.md#引用属性)、[组件引用属性](docs://zh-cn/components/attributes.md#引用属性)

---

## slots

`slots` 用于在组件内部判断插槽内容是否被传递。组件可以通过它根据父组件是否提供插槽内容来调整渲染逻辑。

参考： [插槽](docs://zh-cn/components/slots.md)、[根据传递状态渲染](docs://zh-cn/components/slots.md#根据传递状态渲染)

---

## contexts

`contexts` 用于在组件内部读取上下文数据。每个组件都有属于自己的上下文层，其原型指向父组件的上下文层，因此读取时会沿原型链查找最近的值：在本组件层写入的同名键会遮蔽从父组件继承的键，且不会影响父组件的值。

参考： [上下文](docs://zh-cn/components/contexts.md)

---

## instance

`instance` 指向当前组件自身的实例，它的主要用途是将当前组件实例传递给外部逻辑，供外部模块在调用需要实例绑定的运行时 API 时作为参数传入（如从[运行时包](docs://zh-cn/references/terminology.md#运行时包)导入的 `setContext`、`watch` 等方法）。

参考： [组件实例类型](docs://zh-cn/misc/typescript.md#componentinstance)、[外部注册监视器与副作用](docs://zh-cn/basic/watchers-and-side-effects.md#外部注册)、[在组件外部使用上下文](docs://zh-cn/components/contexts.md#在组件外部使用)

---

## reactive

`reactive` 是一个内建方法，用于显式标注某个标识符具有深度响应性能力。编译器对标识符的处理取决于其声明方式：使用 `let` 或 `var` 声明时，标识符自身及其所有嵌套属性都会被推导为响应式；使用 `const` 声明时，由于标识符本身不可重新赋值，仅其属性会被递归推导为响应式。

参考： [响应性声明](docs://zh-cn/basic/reactivity.md#响应性声明)、[响应性模式](docs://zh-cn/basic/reactivity.md#响应性模式)、[响应性推导规则](docs://zh-cn/references/reactivity-infer-rules.md)

---

## shallow

`shallow` 是一个内建方法，用于显式标注某个标识符具有浅层响应性能力。编译器对标识符的处理取决于其声明方式：使用 `let` 或 `var` 声明时，仅标识符自身会被推导为响应式，其属性不参与响应式推导；使用 `const` 声明时，仅其第一层属性会被推导为响应式，更深层属性不参与推导。

参考： [响应性声明](docs://zh-cn/basic/reactivity.md#响应性声明)、[响应性模式](docs://zh-cn/basic/reactivity.md#响应性模式)、[响应性推导规则](docs://zh-cn/references/reactivity-infer-rules.md)

---

## raw

`raw` 是一个内建方法，用于显式标注某个标识符为静态值：被 `raw` 标记的标识符不会被编译器赋予响应式能力，对其的修改不会触发页面更新。此外，在模板插值或脚本表达式中，将表达式作为参数传递给 `raw` 方法即可进行**非响应式读取**：求值期间暂停依赖追踪，其中读取的标识符在响应性推导中也不被计为在模板中的访问。

参考： [响应性声明](docs://zh-cn/basic/reactivity.md#响应性声明)、[非响应式读取](docs://zh-cn/basic/reactivity.md#非响应式读取)、[响应性推导规则](docs://zh-cn/references/reactivity-infer-rules.md)

---

## alias

`alias` 是一个内建方法，用于创建某个标识符的别名。通过 `alias`，开发者可以将复杂的访问或写入操作简化为更直观的表达，同时保持响应性。

参考： [响应性别名](docs://zh-cn/basic/reactivity.md#响应性别名)、[属性解构](docs://zh-cn/components/attributes.md#响应式解构)

---

## derived

`derived` 是一个内建方法，用于创建衍生响应式状态。通过 `derived`，开发者可以基于现有响应式状态定义新的响应式状态，这些衍生状态会自动追踪依赖并在依赖变化时更新。

参考： [衍生响应式状态](docs://zh-cn/basic/reactivity.md#衍生响应式状态)

---

## derivedExp

`derivedExp` 是一个内建方法，用于以表达式形式声明衍生响应式状态，等价于向 `derived` 传入 getter 的写法，适用于较为简单的计算逻辑。

参考： [衍生响应式状态](docs://zh-cn/basic/reactivity.md#衍生响应式状态)、[响应性推导规则](docs://zh-cn/references/reactivity-infer-rules.md)

---

## watchExp

`watchExp` 是一个内建方法，用于创建监视器的简写注册。通过 `watchExp`，开发者可以直接传入表达式来定义监视器依赖，编译器会自动将其转换为标准的 `watch` 注册。

参考： [监视器](docs://zh-cn/basic/watchers-and-side-effects.md#监视器)、[便捷注册](docs://zh-cn/basic/watchers-and-side-effects.md#便捷注册)

---

## preWatchExp

`preWatchExp` 是一个内建方法，用于创建前置监视器的简写注册。通过 `preWatchExp`，开发者可以直接传入表达式来定义前置监视器依赖，编译器会自动将其转换为标准的 `preWatch` 注册。

参考： [监视器](docs://zh-cn/basic/watchers-and-side-effects.md#监视器)、[便捷注册](docs://zh-cn/basic/watchers-and-side-effects.md#便捷注册)

---

## postWatchExp

`postWatchExp` 是一个内建方法，用于创建后置监视器的简写注册。通过 `postWatchExp`，开发者可以直接传入表达式来定义后置监视器依赖，编译器会自动将其转换为标准的 `postWatch` 注册。

参考： [监视器](docs://zh-cn/basic/watchers-and-side-effects.md#监视器)、[便捷注册](docs://zh-cn/basic/watchers-and-side-effects.md#便捷注册)

---

## syncWatchExp

`syncWatchExp` 是一个内建方法，用于创建同步监视器的简写注册。通过 `syncWatchExp`，开发者可以直接传入表达式来定义同步监视器依赖，编译器会自动将其转换为标准的 `syncWatch` 注册。

参考： [监视器](docs://zh-cn/basic/watchers-and-side-effects.md#监视器)、[便捷注册](docs://zh-cn/basic/watchers-and-side-effects.md#便捷注册)

---

## watch

`watch` 是一个内建方法，用于为响应式状态注册监视器。当被观察的值发生变化时，回调会被调用，并接收修改前的值与当前值两个参数。`watch` 无需导入即可直接调用，编译器会自动将其绑定到当前组件实例，组件销毁时自动清理。

参考： [监视器](docs://zh-cn/basic/watchers-and-side-effects.md#监视器)

---

## preWatch

`preWatch` 是一个内建方法，用于注册前置监视器。前置监视器会在更新调度器执行前触发，适用于需要在状态变更后、模板更新前执行的逻辑。`preWatch` 无需导入即可直接调用，编译器会自动将其绑定到当前组件实例，组件销毁时自动清理。

参考： [前置监视器](docs://zh-cn/basic/watchers-and-side-effects.md#前置监视器)

---

## postWatch

`postWatch` 是一个内建方法，用于注册后置监视器。后置监视器会在更新调度完成后触发，适用于需要等待状态稳定或 DOM 更新之后的处理逻辑。`postWatch` 无需导入即可直接调用，编译器会自动将其绑定到当前组件实例，组件销毁时自动清理。

参考： [后置监视器](docs://zh-cn/basic/watchers-and-side-effects.md#后置监视器)

---

## syncWatch

`syncWatch` 是一个内建方法，用于注册同步监视器。被依赖的响应式值发生变化后，同步监视器的回调会立即触发，优先于更新调度器执行。`syncWatch` 无需导入即可直接调用，编译器会自动将其绑定到当前组件实例，组件销毁时自动清理。

参考： [同步监视器](docs://zh-cn/basic/watchers-and-side-effects.md#同步监视器)

---

## effect

`effect` 是一个内建方法，用于注册响应式副作用。回调执行时访问到的响应式值会被自动收集为依赖，任意一个依赖发生变化时回调都会重新执行。`effect` 无需导入即可直接调用，编译器会自动将其绑定到当前组件实例，组件销毁时自动清理。

参考： [副作用](docs://zh-cn/basic/watchers-and-side-effects.md#副作用)

---

## preEffect

`preEffect` 是一个内建方法，用于注册前置副作用。前置副作用会在更新调度器执行前触发，适用于需要在状态变更后、模板更新前执行的逻辑。`preEffect` 无需导入即可直接调用，编译器会自动将其绑定到当前组件实例，组件销毁时自动清理。

参考： [副作用](docs://zh-cn/basic/watchers-and-side-effects.md#副作用)

---

## postEffect

`postEffect` 是一个内建方法，用于注册后置副作用。后置副作用会在更新调度完成后触发，适用于需要等待状态稳定或 DOM 更新之后的处理逻辑。`postEffect` 无需导入即可直接调用，编译器会自动将其绑定到当前组件实例，组件销毁时自动清理。

参考： [副作用](docs://zh-cn/basic/watchers-and-side-effects.md#副作用)

---

## syncEffect

`syncEffect` 是一个内建方法，用于注册同步副作用。被依赖的响应式值发生变化后，同步副作用的回调会立即触发，优先于更新调度器执行。`syncEffect` 无需导入即可直接调用，编译器会自动将其绑定到当前组件实例，组件销毁时自动清理。

参考： [副作用](docs://zh-cn/basic/watchers-and-side-effects.md#副作用)

---

## defaults

`defaults` 是一个内建方法，用于为组件的可选属性定义默认值。它接收一个对象作为参数：其中 `props` 键为普通属性与事件属性指定默认值，`refs` 键为引用属性指定默认值，`contexts` 键为上下文指定默认值；当父组件未传递对应属性（或上下文中不存在对应键）时，这些默认值将被使用。

参考： [属性默认值](docs://zh-cn/components/attributes.md#指定默认值)、[上下文默认值](docs://zh-cn/components/contexts.md#指定默认值)、[默认值推断](docs://zh-cn/misc/typescript.md#默认值推断)

---

## setContext

`setContext` 是一个内建方法，用于向当前组件的上下文层写入数据。写入的数据可以被本组件及所有后代组件通过内建的 `contexts` 标识符读取：本组件层写入的同名键会遮蔽从父组件继承的键，且不会影响父组件的值。

参考： [上下文](docs://zh-cn/components/contexts.md)

---

## setContextGetter

`setContextGetter` 是一个内建方法，用于向当前组件的上下文层写入一个 `getter`。与 `setContext` 不同，后代组件读取 `contexts.key` 时，框架会**自动调用**该 `getter`，因此可用来实现上下文值的响应式传递。

参考： [上下文的响应性](docs://zh-cn/components/contexts.md#响应性)

---

## setContextExp

`setContextExp` 是一个内建方法，用于创建 `setContextGetter` 的简写声明。通过 `setContextExp`，开发者可以直接传入表达式，编译器会自动将其包装为 `getter` 并转换为 `setContextGetter` 调用。

参考： [上下文的响应性](docs://zh-cn/components/contexts.md#响应性)
