import type { ScriptKind } from "typescript"

import {
    isNull,
    isNumber,
    isString,
    isUndefined,
    isEmptyString
} from "../../../../shared-util/assert"
import { snapshotCache } from "../proxies"
import { QingKuaiSnapShot } from "../snapshot"
import { isEqualToken, isInTopScope, walk } from "../ast"
import { stringify } from "../../../../shared-util/sundry"
import { UpdateSnapshotParams } from "../../../../types/communication"
import { globalTypeIdentifierRE, validIdentifierRE } from "../regular"
import { languageService, Logger, project, projectService, server, ts } from "../state"

export function attachUpdateSnapshot() {
    server.onRequest<UpdateSnapshotParams>("updateSnapshot", params => {
        const { fileName, slotInfo, scriptKindKey, interCode } = params
        const oldContent = snapshotCache.get(fileName)!.getFullText()
        const notExistingGlobalType = new Set(["Props", "Refs"])
        const scriptKind = ts.ScriptKind[scriptKindKey]
        const storedTypes = new Map<number, string>()
        const slotInfoKeys = Object.keys(slotInfo)

        // 将每个待提取类型的索引记录到storedTypes
        slotInfoKeys.forEach(slotName => {
            slotInfo[slotName].properties.forEach(property => {
                isNumber(property[2]) && storedTypes.set(property[2], "")
            })
        })

        // 将由qingkuai编译器产生的中间代码更新到快照
        updateSnapshot(fileName, interCode, scriptKind)

        // 分析中间代码AST，记录script部分错误及全局类型标识符的存在状态
        const program = languageService.getProgram()!
        const typeChecker = program?.getTypeChecker()!
        walk(program.getSourceFile(fileName), node => {
            let globalTypeIdentifierName = ""

            if (
                ts.isImportSpecifier(node) ||
                ts.isVariableDeclaration(node) ||
                ts.isTypeAliasDeclaration(node) ||
                ts.isInterfaceDeclaration(node)
            ) {
                globalTypeIdentifierName = node.name.getText()
            } else if (
                ts.isBinaryExpression(node) &&
                isEqualToken(node.operatorToken) &&
                node.left.getText() === "__c__.Receiver" &&
                !isUndefined(storedTypes.get(node.right.pos))
            ) {
                const type = typeChecker.getTypeAtLocation(node.right)
                storedTypes.set(node.right.pos, typeChecker.typeToString(type))
            }

            if (!isEmptyString(globalTypeIdentifierName)) {
                const m = globalTypeIdentifierRE.exec(globalTypeIdentifierName)
                if (!isNull(m) && isInTopScope(node)) {
                    notExistingGlobalType.delete(globalTypeIdentifierName)
                }
            }
        })

        // notExistingGlobalType中的类型标识符(Props/Refs)默认为never
        const globalType = Array.from(notExistingGlobalType).reduce((ret, id) => {
            if (scriptKindKey === "TS") {
                return `${ret}type ${id}=never;`
            } else {
                return `${ret}/**@typedef {never}${id}*/`
            }
        }, "")

        // 根据storedTypes记录的类型组合出当前文件所表示的组件的slot类型
        const slotType = slotInfoKeys.reduce((ret, slotName, i) => {
            const { properties } = slotInfo[slotName]
            const key = validIdentifierRE.test(slotName) ? slotName : stringify(slotName)
            const value = properties.reduce((ret, property, i) => {
                const [name, _, iot] = property // iot: Index(inter code) Or Type(string)
                const key = validIdentifierRE.test(name) ? name : stringify(name)
                const value = isString(iot) ? stringify(iot) : storedTypes.get(iot)
                return `${ret}${key}:${value}${i === properties.length - 1 ? "}" : ","}`
            }, "{")
            return `${ret}${key}:${value}${i === slotInfoKeys.length - 1 ? "" : ","}`
        }, "")

        // 如果附加中间代码部分未改变，无需更新快照，防止再次增量解析语法树
        const extraStatement = getExtraStatement(globalType, slotType)
        if (
            !isEmptyString(extraStatement) &&
            oldContent.slice(-extraStatement.length) !== extraStatement
        ) {
            updateSnapshot(fileName, interCode + extraStatement, scriptKind)
        }

        // 刷新已打开文件的诊断信息
        setTimeout(() => project.refreshDiagnostics(), 300)
    })
}

// 增量更新qk文件快照内容
function updateSnapshot(fileName: string, interCode: string, scriptKind: ScriptKind) {
    const scriptInfo = projectService.getScriptInfo(fileName)!
    if (isUndefined(scriptInfo)) {
        return
    }

    const newSnapshot = new QingKuaiSnapShot(interCode, scriptKind)
    const change = newSnapshot.getChangeRange(snapshotCache.get(fileName)!)

    const changeStart = change.span.start
    scriptInfo.editContent(
        changeStart,
        changeStart + change.span.length,
        newSnapshot.getText(changeStart, changeStart + change.newLength)
    )
    snapshotCache.set(fileName, newSnapshot)
}

// 获取中间代码中的附加语句：全局类型、默认导出语句
function getExtraStatement(globalType: string, slotType: string) {
    return `${globalType}export class{constructor(_:Props,__:Refs,___:{${slotType}})}`
}
