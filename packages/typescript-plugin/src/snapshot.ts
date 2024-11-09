import type { IScriptSnapshot, ScriptKind } from "typescript"

export class QingKuaiSnapShot implements IScriptSnapshot {
    constructor(
        private text: string,
        public scriptKind: ScriptKind
    ) {}

    getFullText() {
        return this.text
    }

    getText(start: number, end: number) {
        return this.text.slice(start, end)
    }

    getLength() {
        return this.text.length
    }

    getChangeRange(oldSnapshot: QingKuaiSnapShot) {
        const newText = this.text
        const oldText = oldSnapshot.text
        const oldLength = oldText.length
        const newLength = newText.length

        let diffStartIndex = 0
        let oldEndIndex = oldLength - 1
        let newEndIndex = newLength - 1

        // 新旧快照无变化，返回无变化表示
        // If snapshots are identical, return no change
        if (oldText === newText) {
            return {
                span: {
                    start: 0,
                    length: 0
                },
                newLength: 0
            }
        }

        // 从前向后找到首个不同字符的索引
        // find the index of first different character from front to back
        while (
            diffStartIndex < oldLength &&
            diffStartIndex < newLength &&
            oldText[diffStartIndex] === newText[diffStartIndex]
        ) {
            diffStartIndex++
        }

        // 从后向前找到首个不同字符的索引
        // find the index of first different character from back to front
        while (
            diffStartIndex <= oldEndIndex &&
            diffStartIndex <= newEndIndex &&
            oldText[oldEndIndex] === newText[newEndIndex]
        ) {
            oldEndIndex--
            newEndIndex--
        }

        return {
            span: {
                start: diffStartIndex,
                length: oldEndIndex - diffStartIndex + 1
            },
            newLength: newEndIndex - diffStartIndex + 1
        }
    }
}
