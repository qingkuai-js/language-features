import nodeUrl from "node:url"
import nodePath from "node:path"

import { util as qingkuaiUtil } from "qingkuai/compiler"

export const QUERY_EXPANSION_MAP: Record<string, string[]> = {
    qingkuai: ["getting-started", "installation", "basic", "components"],
    framework: ["getting-started", "installation", "create", "project"],
    scaffold: ["create", "project", "installation"],
    bootstrap: ["create", "project", "installation"],
    create: ["create", "project", "installation", "getting-started"],
    init: ["installation", "create", "project", "getting-started"],
    安装qingkuai: ["installation", "install", "getting-started"],
    qk: ["basic", "syntax", "components", "attributes"],
    安装: ["installation", "install", "getting-started"],
    初始化: ["installation", "create", "project", "getting-started"],
    创建项目: ["create", "project", "installation", "getting-started"],
    新建项目: ["create", "project", "installation", "getting-started"],
    创建应用: ["create", "project", "installation", "getting-started"],
    脚手架: ["create", "project", "installation"],
    框架: ["getting-started", "installation", "create", "project"],
    语法: ["syntax", "grammar", "basic"],
    指令: ["directive", "directives"],
    引用属性: ["reference", "attributes", "forms"],
    双向绑定: ["reference", "attributes", "forms", "value", "checked"],
    表单: ["forms", "input", "checked", "value"],
    响应式: ["reactivity", "derived", "reactive", "shallow", "raw"],
    组件: ["components", "component"],
    配置: ["config", "configuration", "qingkuairc", "prettierrc"],
    格式化: ["format", "prettier", "config"],
    编译: ["compile", "compiler", "reactivity"],
    悬停: ["hover", "reactivity", "inferred"],
    事件: ["event", "events"],
    属性: ["attributes", "props"],
    官网: ["getting-started", "installation"]
}

export const dirname = nodePath.dirname(nodeUrl.fileURLToPath(import.meta.url))

export const COMPILE_TOOL_DESCRIPTION = qingkuaiUtil.formatSourceCode(`
    Compile Qingkuai (.qk) source code to JavaScript. Performs full compilation pipeline:
    - Syntax validation (parsing, analysis)
    - Template compilation to render functions
    - Reactivity detection and optimization
    - Source map generation
    Returns compiled JavaScript code, error messages, and source mappings.
`)

export const SYNTAX_CHECK_TOOL_DESCRIPTION = qingkuaiUtil.formatSourceCode(`
    Check Qingkuai (.qk) source code syntax without full compilation. Performs early stage compilation (template parsing, script analysis) to validate:
    - Template structure and tag nesting
    - Script syntax errors
    - Directive usage and attributes
    Returns syntax errors, warnings, and type information without code generation.
`)

export const FORMAT_CODE_TOOL_DESCRIPTION = qingkuaiUtil.formatSourceCode(`
    Format a Qingkuai (.qk) file using Prettier with the Qingkuai plugin. Applies consistent code style and formatting:
    - Indentation and spacing normalization
    - Line breaking and wrapping
    - Consistent quote styles (template literals, single quotes, etc.)
    - Component attribute formatting
    Input is a file path. The tool reads file contents, loads Prettier config with that path, formats, and writes back to the same file.
    Returns write result and any formatting errors.
`)

export const BOOTSTRAP_TOOL_DESCRIPTION = qingkuaiUtil.formatSourceCode(`
    Use this first when user asks to create/init a Qingkuai project in a new or empty folder. Returns authoritative install/scaffold docs URIs and snippets.
`)

export const SEARCH_DOCS_TOOL_DESCRIPTION = qingkuaiUtil.formatSourceCode(`
    Search official Qingkuai syntax/reference docs for .qk files.
    This is the primary source for syntax and API questions.
    Always call this tool before falling back to website search.
    Also use this for project setup/scaffolding requests (installation, init, create app) before generating commands or code.
    Use this for questions mentioning qingkuai, qk, directives, grammar, attributes, compiler rules, examples, install, init, scaffold, or framework usage.
`)
