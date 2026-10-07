// 本 workspace 的包以 catalog: 协议声明依赖，只有 pnpm publish 会在打包时
// 将其替换为真实版本号；npm publish 会原样发布，产出无法安装的 manifest。
// 本脚本挂在 prepublishOnly 上，在非 pnpm 通道发布时立即中止。
const userAgent = process.env.npm_config_user_agent ?? ""

if (!userAgent.startsWith("pnpm/")) {
    console.error(
        "[publish-guard] Detected a non-pnpm publish channel (user-agent: " + (userAgent || "unknown") + ")\n" +
        "[publish-guard] This package declares workspace catalog: dependencies that only \"pnpm publish\" resolves.\n" +
        "[publish-guard] Aborting. Please run: pnpm publish"
    )
    process.exit(1)
}
