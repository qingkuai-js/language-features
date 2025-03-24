export enum Messages {
    LanguageServerStarted = "QingKuai language server starts successfully.",
    ConnectTsServerPluginSuccess = "Connect to typescript-plugin-qingkuai ipc server successfully.",
    WaitForReconnectTsServer = "Typescript server has exited and is watting to reconnect the ipc server of typescript-plugin-qingkuai...",
    ConnectTsServerPluginFailed = "Failed to connect to typescript-plugin-qingkuai ipc server within one minute, please check whether the vscode built-in typescript-language-features extension is enabled."
}

export const communicationWayInfo = (sockPath: string) => {
    return `QingKuai language server and typescript server communicate with ${process.platform === "win32" ? "named pipe" : "sock file"}: "${sockPath}"`
}
