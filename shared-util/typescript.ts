import { setTypeScriptPath } from "qingkuai/compiler"

import { TYPESCRIPT_ENTRY_ENV } from "./constant"

// 复用宿主已安装的 typescript（VS Code 内置或工作区内），发布包因此不再附带完整的 typescript 包
// Reuse the typescript installed by the host (bundled with VS Code or from the workspace), so the
// published extension no longer ships a full copy of the package.
//
// 这里只登记入口文件路径，真正的加载推迟到编译器首次使用时
// Only the entry file path is registered here; loading is deferred until the compiler is first used.
export function setTypeScriptFromEnv(): string | undefined {
    const entry = process.env[TYPESCRIPT_ENTRY_ENV]
    if (entry) {
        setTypeScriptPath(entry)
    }
    return entry
}
