const fsextra = require("fs-extra")
const nodePath = require("node:path")

const dir = nodePath.resolve(__dirname, "../packages/language-service/dist/temp-types")

fsextra.readdirSync(dir, { recursive: true }).forEach(file => {
    const fullPath = nodePath.join(dir, file)
    if (fsextra.statSync(fullPath).isFile() && fullPath.endsWith(".d.ts")) {
        const content = fsextra.readFileSync(fullPath, "utf-8")
        const re = /(?:^|\s)(?:import|export)\s.*from\s(['"])(.*\?raw)\1(?:[\s;]|$)/g
        for (const item of content.matchAll(re)) {
            const relativePath = item[2].slice(0, -4)
            const absolutePath = nodePath.resolve(fullPath, "..", relativePath)
            console.log(absolutePath)
            fsextra.createFileSync(absolutePath)
            fsextra.writeFileSync(
                absolutePath,
                "declare const content: string; export default content;",
                "utf-8"
            )
        }
        fsextra.writeFileSync(
            fullPath,
            content.replace(re, s => {
                return s.replace(/\?raw(?=['"'])/, "")
            })
        )
    }
})
