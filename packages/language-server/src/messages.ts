export const connectSuccess = "The QingKuai language server starts successfully."

export const connectTsPluginServerSuccess =
    "Connect to typescript-qingkuai-plugin ipc server successfully."

export const communicationWayInfo = (sockPath: string) =>
    `QingKuai language server and typescript server communicate with ${process.platform === "win32" ? "named pipe" : "sock file"}: "${sockPath}"`

export const connectTsPluginServerFailed =
    "Failed to connect to typescript-qingkuai-plugin ipc server within one minute, please check if the vscode built-in typescript-language-features extension is enabled."
