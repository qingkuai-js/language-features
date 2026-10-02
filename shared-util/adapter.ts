import type { AdapterFS, AdapterPath } from "../types/common"

import nodeFs from "node:fs"
import nodePath from "node:path"

export function createAdapterFsWithNodeFs(fsImpl: typeof nodeFs): AdapterFS {
    return {
        exist(path) {
            return fsImpl.existsSync(path)
        },
        read(path) {
            return fsImpl.readFileSync(path, "utf-8")
        }
    }
}

export function createAdapterPathWithNodePath(pathImpl: typeof nodePath): AdapterPath {
    return {
        ext(path: string) {
            return pathImpl.extname(path)
        },
        dir(path: string) {
            return pathImpl.dirname(path)
        },
        base(path: string) {
            return pathImpl.basename(path)
        },
        resolve(...paths: string[]) {
            return pathImpl.resolve(...paths)
        },
        relative(from: string, to: string) {
            return pathImpl.relative(from, to)
        }
    }
}
