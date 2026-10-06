import type { TaskRoute } from "./types"

import nodeUrl from "node:url"
import nodePath from "node:path"

import { util as qingkuaiUtil } from "qingkuai/compiler"

export const dirname = nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url))

/** 中英文意图检索词扩展：仅作辅助加权，中文召回主要依赖 zh-cn 语料索引 */
export const QUERY_EXPANSION_MAP: Record<string, string[]> = {
    qingkuai: ["syntax", "framework"],
    framework: ["getting-started", "installation", "create", "project"],
    scaffold: ["create", "project", "installation"],
    bootstrap: ["create", "project", "installation"],
    create: ["create", "project", "installation", "getting-started"],
    init: ["installation", "create", "project", "getting-started"],
    install: ["installation", "getting-started"],
    安装qingkuai: ["installation", "install", "getting-started"],
    安装: ["installation", "install", "getting-started"],
    初始化: ["installation", "create", "project", "getting-started"],
    创建项目: ["create", "project", "installation", "getting-started"],
    新建项目: ["create", "project", "installation", "getting-started"],
    创建应用: ["create", "project", "installation", "getting-started"],
    脚手架: ["create", "project", "installation"],
    框架: ["getting-started", "installation"],
    官网: ["getting-started", "installation"],
    语法: ["syntax", "grammar"],
    指令: ["directive", "directives", "#if", "#for", "#await", "#html"],
    条件渲染: ["#if", "conditional"],
    列表渲染: ["#for", "list", "rendering"],
    循环: ["#for", "loop", "list"],
    遍历: ["#for", "iterate"],
    插槽: ["slot", "slots"],
    具名插槽: ["slot", "slots", "named"],
    作用域插槽: ["slot", "scoped"],
    异步: ["async", "#await", "await"],
    等待: ["#await", "await", "async"],
    悬停: ["hover", "reactivity", "inferred"],
    事件: ["event", "events"],
    属性: ["attributes", "props"],
    传参: ["props", "attribute"],
    传值: ["props", "attribute"],
    引用: ["reference", "refs"],
    引用属性: ["reference", "attributes", "forms"],
    引用元素: ["refs", "handle"],
    双向绑定: ["reference", "attributes", "forms", "value", "checked"],
    表单: ["forms", "input", "checked", "value"],
    响应式: ["reactivity", "derived", "reactive", "shallow", "raw"],
    派生: ["derived", "reactivity"],
    计算属性: ["derived", "reactivity"],
    侦听: ["watch", "watcher"],
    监听: ["watch", "watcher"],
    副作用: ["watch", "side", "effect"],
    生命周期: ["lifecycle", "mount", "unmount"],
    插值: ["interpolation", "block"],
    模板: ["template", "interpolation"],
    组件: ["components", "component"],
    动态组件: ["dynamic", "component"],
    懒加载: ["lazy", "async"],
    上下文: ["context", "provide", "inject"],
    注入: ["inject", "provide", "context"],
    样式: ["style", "stylesheet", "class", "css"],
    过渡: ["transition", "animation"],
    动画: ["transition", "animation"],
    内置元素: ["builtin", "element", "qk:spread"],
    内置: ["builtin", "intrinsic"],
    内建: ["builtin", "intrinsic"],
    标识符: ["intrinsic", "identifier"],
    类型: ["typescript", "type"],
    配置: ["config", "configuration", "qingkuairc", "prettierrc"],
    格式化: ["format", "prettier", "config"],
    编译: ["compile", "compiler", "reactivity"],
    报错: ["error", "error-code"],
    错误: ["error", "error-code"],
    警告: ["warning"],
    调试: ["debug", "debugging"],
    优化: ["optimization", "performance"]
}

/**
 * 任务意图：文档路由（canonical 路径后缀匹配，en/zh-cn/agent 层共享）。
 * 与 docs/articles/agent/index.md 的 Task To Docs 保持同步。
 */
export const TASK_ROUTES: TaskRoute[] = [
    {
        patterns: ["interpolation", "插值"],
        paths: ["basic/interpolation.md"]
    },
    {
        patterns: ["event", "事件"],
        paths: ["basic/event-handling.md"]
    },
    {
        patterns: ["directive", "指令", "#if", "#for", "#await", "#html", "#target", "slot"],
        paths: ["basic/compilation-directives.md"]
    },
    {
        patterns: ["reactivity", "响应式", "derived", "raw(", "shallow("],
        paths: ["basic/reactivity.md", "references/reactivity-infer-rules.md"]
    },
    {
        patterns: ["form", "表单", "双向绑定", "checkbox", "radio", "&value", "&checked"],
        paths: ["basic/forms.md", "basic/reference-attributes.md"]
    },
    {
        patterns: ["watch", "侦听", "副作用", "side effect"],
        paths: ["basic/watchers-and-side-effects.md"]
    },
    {
        patterns: ["slot", "插槽"],
        paths: ["components/slots.md"]
    },
    {
        patterns: ["props", "透传", "inherit"],
        paths: ["components/attributes.md", "references/intrinsics.md"]
    },
    {
        patterns: ["lifecycle", "生命周期"],
        paths: ["components/lifecycle.md"]
    },
    {
        patterns: ["context", "上下文", "provide", "inject", "注入"],
        paths: ["components/contexts.md"]
    },
    {
        patterns: ["style", "stylesheet", "样式", "css"],
        paths: ["components/stylesheets.md"]
    },
    {
        patterns: ["lazy", "懒加载", "suspense"],
        paths: ["components/async-components.md"]
    },
    {
        patterns: ["spread", "qk:spread"],
        paths: ["misc/builtin-elements.md"]
    },
    {
        patterns: ["intrinsic", "标识符", "refs"],
        paths: ["references/intrinsics.md"]
    },
    {
        patterns: ["typescript", "类型", "generic", "泛型"],
        paths: ["misc/typescript.md"]
    },
    {
        patterns: ["config", "配置", "qingkuairc", "prettierrc"],
        paths: ["misc/config-files.md"]
    },
    {
        patterns: ["error", "错误", "报错"],
        paths: ["references/error-code.md"]
    },
    {
        patterns: ["install", "安装", "init", "初始化", "scaffold", "脚手架"],
        paths: ["getting-started/install.md", "getting-started/introduction.md"]
    },
    {
        patterns: ["runtime api", "运行时"],
        paths: ["references/api.md"]
    }
]

/** 命中任务路由时的组加权 */
export const TASK_ROUTE_BOOST = 18

/**
 * 随 initialize 响应下发的 server instructions（协议级行为引导通道，
 * 与 MCP prompts capability 无关——prompts 需要客户端主动拉取，多数 agent 不会拉取）。
 */
export const SERVER_INSTRUCTIONS = qingkuaiUtil.formatSourceCode(`
    Qingkuai (.qk) working protocol:
    1. For ANY question about .qk syntax, directives, attributes, events, reactivity, or components: call search_qingkuai_docs FIRST. Never write .qk syntax from memory.
    2. Base answers on the doc sections returned by search_qingkuai_docs; use read_qingkuai_doc when a full document or a specific section is needed.
    3. Prefer reference attributes for two-way binding: use &value/&number/&checked/&group instead of !attr + @event/@update; use &handle instead of querySelector/getElementById.
    4. Prefer compiler-inferred reactivity; use reactive/shallow/raw only when necessary, and derived()/derivedExp() for derived state.
    5. After writing or editing .qk code, verify it with check_qingkuai_syntax; use compile_qingkuai if problems persist. Do not finalize output while errors remain.
    6. To create or initialize a Qingkuai project, call get_qingkuai_project_bootstrap_guide first and never invent install commands.
`)

export const COMPILE_TOOL_DESCRIPTION = qingkuaiUtil.formatSourceCode(`
    Compile Qingkuai (.qk) source code to JavaScript. Performs full compilation pipeline:
    - Syntax validation (parsing, analysis)
    - Template compilation to render functions
    - Reactivity detection and optimization
    - Source map generation
    Returns compiled JavaScript code, error messages, and source mappings.
    Use this when the user wants to compile or transpile .qk source code to JavaScript, or asks about the compilation result.
`)

export const SYNTAX_CHECK_TOOL_DESCRIPTION = qingkuaiUtil.formatSourceCode(`
    Check Qingkuai (.qk) source code syntax without full compilation. Performs early stage compilation (template parsing, script analysis) to validate:
    - Template structure and tag nesting
    - Script syntax errors
    - Directive usage and attributes
    Returns syntax errors, warnings, and type information without code generation.
    Use this when the user wants to validate or check .qk code syntax, or reports a syntax error in a .qk file.
`)

export const FORMAT_CODE_TOOL_DESCRIPTION = qingkuaiUtil.formatSourceCode(`
    Format a Qingkuai (.qk) file using Prettier with the Qingkuai plugin. Applies consistent code style and formatting:
    - Indentation and spacing normalization
    - Line breaking and wrapping
    - Consistent quote styles (template literals, single quotes, etc.)
    - Component attribute formatting
    Input is a file path. The tool reads file contents, loads Prettier config with that path, formats, and writes back to the same file.
    Returns write result and any formatting errors.
    Use this when the user wants to format, reformat, or fix the styling of a .qk file.
`)

export const BOOTSTRAP_TOOL_DESCRIPTION = qingkuaiUtil.formatSourceCode(`
    Use this first when user asks to create/init a Qingkuai project in a new or empty folder. Returns authoritative install/scaffold docs URIs and snippets.
`)

export const SEARCH_DOCS_TOOL_DESCRIPTION = qingkuaiUtil.formatSourceCode(`
    Search the official Qingkuai reference docs for .qk files. This is the AUTHORITATIVE source for Qingkuai syntax, directives, attributes, events, reactivity, and components. Accepts English, Chinese, or syntax tokens (e.g. #for, &value, qk:spread).
    ALWAYS call this tool when the user asks about Qingkuai syntax, grammar, directives, attributes, events, interpolation, reactivity, components, compiler rules, or how to write .qk code — do NOT answer from memory.
    Results include matched doc sections with full content inline. Base answers on these sections; call read_qingkuai_doc for a full document or a specific section. Verify generated .qk code with check_qingkuai_syntax afterwards.
`)

export const READ_DOC_TOOL_DESCRIPTION = qingkuaiUtil.formatSourceCode(`
    Read a Qingkuai doc by its docs:// URI (as returned by search_qingkuai_docs). Supports an #section anchor to read a single section; without an anchor the full document is returned. Unknown URIs return the closest valid URIs.
`)
