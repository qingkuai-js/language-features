import type { AdapterFS, AdapterPath } from "../types/common"

import NodeFS from "node:fs"
import NodePath from "node:path"

export function createAdapterFsWithNodeFs(nodeFs: typeof NodeFS): AdapterFS {
    return {
        exist(path) {
            return nodeFs.existsSync(path)
        },
        read(path) {
            return nodeFs.readFileSync(path, "utf-8")
        }
    }
}

export function createAdapterPathWithNodePath(nodePath: typeof NodePath): AdapterPath {
    return {
        ext(path: string) {
            return nodePath.extname(path)
        },
        dir(path: string) {
            return nodePath.dirname(path)
        },
        base(path: string) {
            return nodePath.basename(path)
        },
        resolve(...paths: string[]) {
            return nodePath.resolve(...paths)
        },
        relative(from: string, to: string) {
            return nodePath.relative(from, to)
        }
    }
}
