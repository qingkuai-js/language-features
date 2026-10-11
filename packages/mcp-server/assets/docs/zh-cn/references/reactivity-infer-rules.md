# 响应性推导规则

在 Qingkuai 中，编译器会根据一套推导规则自动决定各个标识符的响应性类型。了解这些规则有助于开发者更好地管理状态，并在必要时通过显式标记覆盖默认行为。

---

## 推导流程

编译器会按以下顺序对脚本块顶层作用域中的每个标识符进行响应性推导：

1. **检查显式标记**：若变量声明在初始值中调用了 `reactive`、`shallow` 或 `raw`，则优先按显式标记推导；
2. **解析隐式规则**：若未使用显式标记，则根据标识符在模板中的访问情况及其声明形式进行隐式推导。

---

## 显式标记

响应性标记内建方法必须在变量声明的初始值部分调用。当标识符使用上述内建方法进行显式标记时，编译器优先将其推导为对应的响应性类型：

```js
const config = raw([1, 2, 3]) // 原始值
const list = shallow({ debug: false }) // 浅层响应式
const user = reactive({ name: "Qingkuai" }) // 深度响应式
```

### 退化行为

即便使用了显式标记，当声明同时满足以下两个条件时，标识符会**退化为原始值**，显式标记将被编译器忽略：

- 使用 `const` 声明
- 初始值为字面量类型（如数字字面量、字符串字面量等）

```js
// 退化为原始值，shallow 被忽略
const a = shallow(1)

// 退化为原始值，reactive 被忽略
const b = reactive("")

// 正常推导，根据后续使用情况确定其响应性类型
const c = reactive({})
```

未发生退化时，标识符推导为显式标记所指定的响应性类型。

---

## 别名与衍生值

- 别名绑定只能通过 `alias` 内建方法显式创建。
- 衍生响应式值只能通过 `derived` 或 `derivedExp` 内建方法进行显式标记与创建。

这些规则独立于 `reactive`、`shallow`、`raw` 的显式标记流程：

```js
const firstName = reactive("Qing")
const lastName = reactive("kuai")

const userName = alias(props.userInfo.name)

const fullName = derived(() => firstName + " " + lastName)
const shortName = derivedExp(firstName + "-" + lastName)
```

---

## 隐式推导

当标识符未使用任何显式标记时，编译器会先根据其在模板中是否被访问划分路径，再结合声明形式与脚本中的修改情况得出推导结果。

### 未在模板中访问

当标识符未在模板中被访问时，编译器将其推导为原始值。此类标识符仅存在于脚本逻辑中，不会参与依赖收集与更新流程。

```qk
<lang-ts>
    // 从未在模板中访问 → 原始值
    let count = 0

    // 从未在模板中访问 → 原始值
    let message = ""
</lang-ts>

<p> 这里未访问 count 或 message </p>
```

需要注意的是，并非所有出现在模板中的标识符都算作被访问：在模板插值与嵌入脚本表达式中，用内建方法 `raw` 包裹表达式进行[非响应式读取](docs://zh-cn/basic/reactivity.md#非响应式读取)的标识符，不被认作在模板中被访问。

```qk
<lang-ts>
    let user = {
        name: "Qingkuai"
    }

    // 模板中不存在有效的响应式访问 → 原始值
    let config = load()
</lang-ts>

<p>{user.name + raw(config).label}</p>
<p>{user.name + raw(config.label)}</p>
```

### 在模板中访问

当标识符在模板中被访问时，编译器会检查其在脚本中是否存在被修改的情况。此检查适用于以 `let` 或 `var` 声明且初始值为字面量类型的标识符、`class` 与 `function` 声明的标识符，以及 `shallow` 模式下初始值为非字面量表达式的可变标识符：

- **未被修改**：推导为原始值，避免不必要的依赖收集与更新开销
- **存在修改**：推导为当前响应性模式对应的响应性类型

```qk
<lang-js shallow>
    let count = 0

    // 从未赋值 → 不具有响应性
    let state = load()

    function setCount(v) {
        // 源码中存在赋值 → count 被推导为 shallow
        count = v
    }
</lang-js>

<p>{ state }</p>
<button @click={setCount}>{ count }</button>
```

修改的判定并不限于脚本中的显式赋值或自增等修改语句，还有两条特殊规则：

1. 对于通过 `let` 或 `var` 声明的可变标识符，当其被用于引用属性（如 `&value`、`&handle`）时，编译器会将该标识符视为存在可达修改路径，即便脚本中没有修改语句，仍会推导为具有响应性：

    ```qk
    <lang-ts>
        let inputValue = "Initial value"
    </lang-ts>

    <input type="text" &value={inputValue} />
    ```

2. 对于 `class` 声明、`function` 声明、TypeScript `enum` 声明等非变量声明：这类声明不能使用显式标记，响应性完全由隐式推导决定。其中 `class` 与 `function` 声明沿用与字面量初始值的 `let`/`var` 声明相同的修改检查，即名字在脚本中被赋值（或被用于引用属性）且在模板中被访问时，才推导为响应性；`enum` 声明编译后是会被赋值初始化的可变绑定，编译器将其视作恒定存在修改，在模板中被访问时直接按当前响应性模式推导为对应的响应性类型：

    ```qk
    <lang-ts>
        class User {
            name = "Qingkuai"
        }

        function getUser() {
            return new User()
        }

        enum Status {
            Active,
            Inactive
        }

        function reload() {
            // 名字存在赋值 → 满足修改检查
            getUser = () => new User()
        }
    </lang-ts>

    <!-- 存在赋值 + 在模板中访问 → 推导为响应性 -->
    <p>{ getUser().name }</p>

    <!-- enum 视作恒定存在修改 → 推导为响应性 -->
    <p>{ Status.Active }</p>
    ```

### 衍生值源的访问传播

当衍生响应式值在模板中被访问时，其 `derived` getter 或 `derivedExp` 表达式字面量中读取的标识符也会被认作在模板中被访问，并按上一节的规则参与推导（仍要求脚本中存在修改）：

```qk
<lang-js>
    let count = 0

    function setCount(v) {
        // 存在修改 → count 被推导为具有响应性
        count = v
    }

    const double = derivedExp(count * 2)
</lang-js>

<button @click={setCount}>{ double }</button>
```

---

## allowConstReactive 选项

[`allowConstReactive`](docs://zh-cn/misc/config-files.md#allowconstreactive) 运行配置项控制常量声明是否参与响应性推导，默认值为 `true`。当该选项被设为 `false` 时：

- 在隐式推导阶段，`const` 声明的常量不会被推导为具有响应性，统一按原始值处理；
- 在显式标记阶段，使用 `reactive` 或 `shallow` 标记初始值为非字面量表达式的常量声明会被禁止并抛出编译错误：

```js
const list = shallow(getList()) // 编译错误: 1070
const config = reactive(loadConfig()) // 编译错误: 1070
```

---

## 推导提示

如果安装了 Qingkuai [VS Code 扩展](docs://zh-cn/misc/language-features.md#ide-扩展)，嵌入脚本顶部作用域中的标识符会嵌入提示编译器推断出的响应性状态：

<img src="/static/medias/inferred-inlay-hint.png" alt="inferred-inlay-hint.png" style="width:60%; margin-left:20%;"  />

> [!TIP]
> 可以通过修改 VS Code 扩展的 `inlayHintReactiveStatus` 配置项来启用或禁用该提示。

将鼠标指针悬停在顶层作用域的标识符上时，语言服务器还会在提示中显示编译器推导出的响应性类型：

<img src="/static/medias/inferred-reactive.png" alt="inferred-reactive.png" style="width:60%; margin-left:20%;" />
<img src="/static/medias/inferred-raw-never-mutated.png" alt="inferred-raw-never-mutated.png" style="width:60%; margin-left:20%;"  />
<img src="/static/medias/inferred-alias.png" alt="inferred-alias.png" style="width:60%; margin-left:20%;" />
<img src="/static/medias/inferred-derived.png" alt="inferred-derived.png" style="width:60%; margin-left:20%;" />
<img src="/static/medias/inferred-downgraded.png" alt="inferred-downgraded.png" style="width:60%; margin-left:20%;" />

> [!TIP]
> 可以通过修改 VS Code 扩展的 `hoverHintReactiveStatus` 配置项来启用或禁用该提示。
