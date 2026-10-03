---
description: "Qingkuai 编译器为脚本块顶层每个标识符推导响应性类型的有序规则：显式标记、退化条件，以及基于模板用法的隐式推导。"
keywords: ["reactivity inference", "inference rules", "raw", "reactive", "const", "推导规则", "响应性"]
---

# 响应性推导规则

对于脚本块顶层作用域中的每个标识符，编译器按以下顺序执行步骤推导其响应性类型：先检查显式标记，再应用隐式规则。

## 规则

1. **显式标记**：变量声明的初始化器中调用了 `reactive`、`shallow` 或 `raw` 时，该显式标记优先并决定响应性类型。标记只能在变量声明的初始化器中调用。
2. **退化**（即使使用了显式标记也会检查）：标识符退化为 raw 值、标记被忽略的条件是同时满足，即以 `const` 声明，且初始值为字面量类型（如数字字面量或字符串字面量）。未发生退化时，标识符按标记指定的响应性类型推导。
3. **别名与衍生值**（独立于显式标记流程）：别名绑定只能通过 `alias` 内建方法显式创建；衍生响应式值只能通过 `derived`、`derivedExp` 创建并显式标记。
4. **隐式推导**（无显式标记），基于模板用法与声明形式：
   1. 未在模板中访问：推导为 raw 值。这类标识符只存在于脚本逻辑中，不参与依赖收集与更新流程。在插值与嵌入脚本表达式中用 `raw` 包裹进行非响应式读取的标识符，即使出现在模板中也不算被访问。
   2. 在模板中访问：编译器检查该标识符是否在脚本中被修改。该检查适用于以 `let` 或 `var` 声明且初始值为字面量类型的标识符、`class` 与 `function` 声明的标识符，以及 `shallow` 模式下初始值为非字面量表达式的可变标识符。
      - 未修改：推导为 raw 值，避免不必要的依赖收集与更新开销。
      - 已修改：按当前响应性模式推导对应类型。
      - 访问传播：衍生值在模板中被访问时，其 `derived` getter 或 `derivedExp` 表达式字面量中读取的标识符同样视为在模板中被访问，并按上述修改检查参与推导（仍要求脚本中存在修改）。
   3. 被引用属性使用（如 `&value`、`&handle`）：以 `let` 或 `var` 声明的可变标识符被视为存在可达修改路径，即使脚本中没有显式赋值、自增等修改语句，也推导为响应式。
   4. 其他声明形式：`class` 声明、`function` 声明、TypeScript `enum` 声明等非变量声明不能用 `reactive`、`shallow`、`raw` 显式标记，响应性完全由隐式推导决定。`class`/`function` 声明沿用与字面量初始值的 `let`/`var` 声明相同的修改检查，即名字在脚本中被赋值（或被用于引用属性）且在模板中被访问时，才推导为响应性；`enum` 声明编译后是会被赋值初始化的可变绑定，视作恒定存在修改，在模板中被访问时直接按当前响应性模式推导为对应的响应性类型。
5. **`allowConstReactive` 选项**（默认 `true`）：设为 `false` 时，隐式推导中 `const` 常量不再被推导为响应式，统一视为 raw 值；显式标记中对初始值非字面量表达式的常量使用 `reactive` 或 `shallow` 会被禁止并引发编译错误 1070。

## 约束

- 显式标记只在变量声明初始化器中有效；`class`、`function` 和 TypeScript `enum` 声明不能被 `reactive`、`shallow` 或 `raw` 显式标记。
- 退化需要同时满足两个条件（`const` + 字面量初始值）；`const c = reactive({})` 不会退化，最终响应性取决于后续用法。
- 模板用法的修改检查不覆盖所有标识符：它适用于初始值为字面量类型的 `let`/`var` 声明、`class`/`function` 声明，以及 `shallow` 模式下初始值为非字面量表达式的可变标识符。
- 别名与衍生值不能由 `reactive`/`shallow`/`raw` 标记流程产生；它们只有专属的创建形式。

## 示例

显式标记，以及 `const` + 字面量初始化器的退化：

```qk
<lang-ts>
    const a = shallow(1) // 退化为 raw 值；shallow 被忽略
    const b = reactive("") // 退化为 raw 值；reactive 被忽略
    const config = raw([1, 2, 3]) // raw 值
    const list = shallow({ debug: false }) // 浅响应式
    const user = reactive({ name: "Qingkuai" }) // 深响应式
</lang-ts>

<p>{list.debug} {user.name} {config.length}</p>
```

`shallow` 模式下的隐式推导，只有脚本中被修改的标识符成为响应式：

```qk
<lang-js shallow>
    let count = 0
    let state = load() // 从未赋值 → 保持 raw 变量
    function load() {
        return "ready"
    }
    function setCount(v) {
        count = v // 源码中存在赋值 → count 推导为 shallow
    }
</lang-js>

<p>{ state }</p>
<button @click={setCount}>{ count }</button>
```

引用属性使标识符无需任何脚本修改即为响应式：

```qk
<lang-ts>
    let inputValue = "Initial value"
</lang-ts>

<input type="text" &value={inputValue} />
```

衍生值源的访问传播，衍生值在模板中被访问时，其 `derived` getter 或 `derivedExp` 表达式字面量中读取的标识符按「在模板中访问」参与推导（仍要求脚本中存在修改）：

```qk
<lang-js>
    let count = 0
    function setCount(v) {
        count = v
    }
    const double = derivedExp(count * 2)
</lang-js>

<button @click={setCount}>{ double }</button>
```

## 参见

- [响应性](docs://zh-cn/agent/basic/reactivity.md)
