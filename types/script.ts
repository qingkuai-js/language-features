export interface ReleaseRequest {
    tag_name: string
    name: string
    body: string
    draft: boolean
    prerelease: boolean
}

export interface PackageVersion {
    name: string
    version: string
}

export interface ServerManifest {
    version: string
    packages?: { version: string }[]
}

export interface MinimalManifest {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
    peerDependencies?: Record<string, string>
}

export interface ExtensionIdentity extends PackageVersion {
    publisher: string
}

export type VsceMode = "package" | "publish"
