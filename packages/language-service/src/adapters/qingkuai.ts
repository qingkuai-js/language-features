// import type TS from "typescript"
// import type { QingkuaiFileInfo } from "../types/adapter"

// import { compileIntermediate } from "qingkuai/compiler"
// import { ts, adapterFs, typeDeclarationFilePath } from "./state"
// import { ensureTypesForCompileResult } from "./convert/content"

// export function updateQingkuaiFile(fileName: string) {
//     compileQingkuaiFile(ts.server.toNormalizedPath(fileName))
// }

// export function ensureGetQingkuaiFileInfo(fileName: string) {
//     const path = ts.server.toNormalizedPath(fileName)
//     const existing = qingkuaiFileInfos.get(path)
//     if (!existing) {
//         compileQingkuaiFile(path)
//     } else if (!existing.types) {
//         ensureTypesForCompileResult(existing)
//     }
//     return qingkuaiFileInfos.get(path)!
// }

// function compileQingkuaiFile(path: TS.server.NormalizedPath) {
//     const existing = qingkuaiFileInfos.get(path)
//     const newFileInfo: QingkuaiFileInfo = {
//         path,
//         types: false,
//         version: existing ? existing.version + 1 : 0,
//         cr: compileIntermediate(adapterFs.read(path), {
//             typeDeclarationFilePath
//         })
//     }
//     qingkuaiFileInfos.set(path, newFileInfo)
//     ensureTypesForCompileResult(newFileInfo)
// }
