import { compile } from "qingkuai/compiler"
import { QingKuaiSnapShot } from "../snapshot"
import { languageServiceHost, Logger } from "../state"
import { isUndefined } from "../../../../shared-util/assert"

const snapshotCache = new Map<string, QingKuaiSnapShot>()

export function proxyGetScriptSnapshot() {
    const ori = languageServiceHost.getScriptSnapshot
    languageServiceHost.getScriptSnapshot = fileName => {
        const oriRet = ori.call(languageServiceHost, fileName)
        if (isUndefined(oriRet)) {
            return undefined
        }

        if (fileName.endsWith(".qk")) {
            if (!snapshotCache.has(fileName)) {
                const content = oriRet.getText(0, oriRet.getLength())
                snapshotCache.set(
                    fileName,
                    new QingKuaiSnapShot(
                        compile(content, {
                            check: true,
                            componentName: ""
                        }).code
                    )
                )
            }
            return snapshotCache.get(fileName)
        }

        return oriRet
    }
}
