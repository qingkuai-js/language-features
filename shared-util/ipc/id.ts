import { isUndefined } from "../assert"

export const [getReleaseId, releaseId] = (() => {
    const count = 0xffff
    const set = new Set<number>()
    const arr = Array<number>(count)

    for (let i = 0; i < count; i++) {
        const id = count - i
        arr.push(id), set.add(id)
    }

    return [
        // get id
        () => {
            const id = arr.pop()
            if (isUndefined(id)) {
                throw "all ids are in use"
            }
            return set.delete(id), id
        },

        // release a using id
        (id: number) => {
            if (set.has(id)) {
                return
            }
            set.add(id)
            arr.push(id)
        }
    ]
})()
