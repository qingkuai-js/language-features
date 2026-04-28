import nodeUrl from "node:url"
import nodePath from "node:path"

import { util as qingkuaiUtil } from "qingkuai/compiler"

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

export const SEARCH_DOCS_TOOL_DESCRIPTION = qingkuaiUtil.formatSourceCode(`
    Search official Qingkuai syntax/reference docs for .qk files.
    This is the primary source for syntax and API questions.
    Always call this tool before falling back to website search.
    Use this for questions mentioning qingkuai, qk, directives, grammar, attributes, compiler rules, or examples.
`)
