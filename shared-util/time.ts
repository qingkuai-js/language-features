// 返回Date对象表示的时间的格式化表示（2006-01-02 15:04:05)
export function formatDate(date: Date) {
    const year = date.getFullYear()
    const day = ("" + date.getDate()).padStart(2, "0")
    const hour = ("" + date.getHours()).padStart(2, "0")
    const month = `${date.getMonth() + 1}`.padStart(2, "0")
    const minute = ("" + date.getMinutes()).padStart(2, "0")
    const second = ("" + date.getSeconds()).padStart(2, "0")
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}
