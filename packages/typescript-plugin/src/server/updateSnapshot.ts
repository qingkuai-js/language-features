import { snapshotCache } from "../proxies"
import { isInTopScope, walk } from "../ast"
import { QingKuaiSnapShot } from "../snapshot"
import { UpdateSnapshotParams } from "../../../../types/communication"
import { project, projectService, server, ts, typeChecker } from "../state"

export function attachUpdateSnapshot() {
    server.onRequest<UpdateSnapshotParams>("updateSnapshot", params => {
        let refsTypeExisting = false
        let propsTypeExisting = false
        let tailTypeDeclarationStatement = ""

        const { fileName, interCode, scriptKindKey } = params
        const scriptKind = ts.ScriptKind[scriptKindKey]
        const oldSnapshot = snapshotCache.get(fileName)!
        const scriptInfo = projectService.getScriptInfo(fileName)!
        const sourceFile = project.getSourceFile(scriptInfo.path)!
        const newSnapshot = new QingKuaiSnapShot(interCode, scriptKind)

        // 增量更新qk文件快照内容
        const change = newSnapshot.getChangeRange(oldSnapshot)
        const changeStart = change.span.start
        snapshotCache.set(fileName, newSnapshot)
        scriptInfo.editContent(
            changeStart,
            changeStart + change.span.length,
            newSnapshot.getText(changeStart, changeStart + change.newLength)
        )

        // // 检查顶部作用域是否存在Props和Refs类型标识符，并将检查结果记录到快照
        // const symbols = typeChecker.getSymbolsInScope(sourceFile, ts.SymbolFlags.Type)
        // for (let i = 0; i < symbols.length && !(refsTypeExisting && propsTypeExisting); i++) {
        //     refsTypeExisting ||= symbols[i].name === "Refs"
        //     propsTypeExisting ||= symbols[i].name === "Props"
        // }
        // newSnapshot.setGlobalTypeExisting([refsTypeExisting, propsTypeExisting])
        // Logger.info([refsTypeExisting, propsTypeExisting])

        // // 当Refs或Props类型标识符在全局作用于不存在时，在中间代码末尾添加类型声明语句
        // !refsTypeExisting && (tailTypeDeclarationStatement += "type Refs=any;")

        walk(sourceFile, node => {
            if (ts.isIdentifier(node) && isInTopScope(node) && node.text === "Props") {
                console.log(node, typeChecker)
            }
        })

        project.refreshDiagnostics()
    })
}
