const { setDocText } = require("./helpers")

async function raceRequest({ doc, requestFn, nextText, delayMs }) {
    let mutationDone = Promise.resolve()
    const outcome = requestFn().then(response => ({
        response,
        sampled: doc.getText()
    }))
    const timer = new Promise(resolve => {
        setTimeout(() => {
            mutationDone = setDocText(doc, nextText)
            mutationDone.then(resolve)
        }, delayMs)
    })
    const result = await outcome
    await timer
    await mutationDone
    return result
}

module.exports = { raceRequest }
