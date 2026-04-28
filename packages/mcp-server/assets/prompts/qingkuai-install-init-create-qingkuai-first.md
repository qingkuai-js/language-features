Use this prompt when the user asks about Qingkuai project installation, initialization, scaffolding, or bootstrapping.

---

## Trigger Keywords

If request includes any of these intents, apply this prompt first:
- "初始化项目" / "创建项目" / "新建项目"
- "安装 Qingkuai" / "项目安装"
- "scaffold" / "bootstrap" / "create app"

---

## Primary References

- docs://getting-started/installation.md

Read docs first, then provide commands.

---

## Hard Rules

1. For new project initialization, **always prefer `create-qingkuai`** unless user explicitly asks for manual bootstrap.
2. Before final commands, check CLI usage with `npm create qingkuai -- --help` to avoid stale flags.
3. Do not provide manual file-by-file initialization (`mkdir + package.json + src`) when official scaffolding is applicable.
4. Do not invent setup commands not present in docs.
5. If user constraints conflict with docs, state the conflict and provide a docs-aligned alternative.
