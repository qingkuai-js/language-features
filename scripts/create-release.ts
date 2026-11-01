import type { ExtensionIdentity, ReleaseRequest } from "../types/script"

import nodeFs from "node:fs"
import nodePath from "node:path"
import nodeChildProcess from "node:child_process"

const ALREADY_EXISTS = 422
const API = "https://api.github.com"
const ROOT = nodePath.resolve(import.meta.dirname, "..")
const MARKETPLACE = "https://marketplace.visualstudio.com/items?itemName="

function changelogNotes(): string {
    const diff = nodeChildProcess.execFileSync(
        "git",
        ["show", "--format=", "--no-color", "HEAD", "--", "CHANGELOG.md"],
        { cwd: ROOT, encoding: "utf-8" }
    )
    return diff
        .split("\n")
        .filter(line => line.startsWith("+") && !line.startsWith("+++"))
        .map(line => line.slice(1))
        .join("\n")
        .trim()
}

async function main(): Promise<void> {
    const dir = process.argv[2]
    const tag = process.env.GITHUB_REF_NAME
    const repository = process.env.GITHUB_REPOSITORY
    const token = process.env.GITHUB_TOKEN

    if (!dir || !tag || !repository || !token) {
        throw new Error(
            "expected a package dir and GITHUB_REF_NAME, GITHUB_REPOSITORY, GITHUB_TOKEN"
        )
    }

    const raw = nodeFs.readFileSync(nodePath.join(ROOT, dir, "package.json"), "utf-8")
    const { displayName, name, publisher, version } = JSON.parse(raw) as ExtensionIdentity
    const marketLink = `${MARKETPLACE}${publisher}.${name}`

    const payload: ReleaseRequest = {
        tag_name: tag,
        name: `${displayName} VS Code extension v${version}`,
        body: [`[${displayName} on the VS Code Marketplace](${marketLink})`, changelogNotes()]
            .filter(Boolean)
            .join("\n\n"),
        draft: false,
        prerelease: false
    }
    console.log(`creating release ${tag} with ${payload.body.length} bytes of notes`)

    const response = await fetch(`${API}/repos/${repository}/releases`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })

    if (response.ok) {
        return
    }

    const detail = await response.text()
    if (response.status === ALREADY_EXISTS && detail.includes("already_exists")) {
        console.log(`release ${tag} already exists, skipped`)
        return
    }
    throw new Error(`release ${tag} failed with ${response.status}: ${detail}`)
}

main().catch(error => {
    console.error(error)
    process.exitCode = 1
})
