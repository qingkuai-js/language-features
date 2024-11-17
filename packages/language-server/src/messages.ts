export function GlobalTypeIsImplicitAny(id: string) {
    return {
        code: 2001,
        message: `The global type(${id}) has an implicit any type.`
    }
}

export function GlobalTypeMissTypeImpl(id: string) {
    return {
        code: 2002,
        message: `The top scope identifier(${id}) just refs to a value, missing type implementation.`
    }
}

export const connectSuccess = "The QingKuai language server starts successfully."

export const connectTsPluginServerSuccess =
    "Connect to typescript-qingkuai-plugin ipc server successfully."

export const communicationWayInfo = (sockPath: string) =>
    `QingKuai language server and typescript server communicate with ${process.platform === "win32" ? "named pipe" : "sock file"}: "${sockPath}"`

export const connectTsPluginServerFailed =
    "Failed to connect to typescript-qingkuai-plugin ipc server within one minute, please check if the vscode built-in typescript-language-features extension is enabled."
