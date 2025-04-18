import { ts } from "../state"
import { qkContext } from "qingkuai-language-service/adapters"
import { ensureGetSnapshotOfQingkuaiFile } from "../util/qingkuai"
import { isQingkuaiFileName } from "../../../../shared-util/assert"

export function proxyReadFile() {
    const readFile = ts.sys.readFile.bind(ts.sys)
    ts.sys.readFile = (fileName, encoding) => {
        if (!isQingkuaiFileName(fileName)) {
            return readFile(fileName, encoding)
        }
        return ensureGetSnapshotOfQingkuaiFile(qkContext.getRealPath(fileName)).getFullText()
    }
}

export function proxyGetFileSize() {
    const getFileSize = ts.sys.getFileSize
    if (!getFileSize) {
        return
    }
    ts.sys.getFileSize = path => {
        if (!isQingkuaiFileName(path)) {
            return getFileSize.call(ts.sys, path)
        }
        return ensureGetSnapshotOfQingkuaiFile(qkContext.getRealPath(path)).getLength()
    }
}
