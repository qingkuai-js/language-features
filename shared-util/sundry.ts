import util from "util"

// print debugging info, the informations will be output to
// "QingKuai Language Server" item of output tab of extension host.
export function print(...values: any[]) {
    const inspectValues = values.map(value => {
        return util.inspect(value, { depth: null })
    })
    console.log(inspectValues.join(" "))
}
