import type { AdapterFS, AdapterPath } from "../types/common"

import nodeFs from "node:fs"
import nodePath from "node:path"

export const adapterFs: AdapterFS = {
    exist: nodeFs.existsSync,
    read: path => nodeFs.readFileSync(path, "utf-8")
}

export const adapterPath: AdapterPath = {
    ext(path: string) {
        return nodePath.extname(path)
    },
    dir(path: string) {
        return nodePath.dirname(path)
    },
    resolve(...paths: string[]) {
        return nodePath.resolve(...paths)
    },
    relative(from: string, to: string) {
        return nodePath.relative(from, to)
    },
    base(path: string) {
        return nodePath.basename(path, nodePath.extname(path))
    }
}
