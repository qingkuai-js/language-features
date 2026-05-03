Use this prompt when the user asks about Qingkuai project installation, initialization, scaffolding, or bootstrapping.

---

## Trigger Keywords

If request includes any of these intents, apply this prompt first:
- "初始化项目" / "创建项目" / "新建项目"
- "安装 Qingkuai" / "项目安装"
- "使用 Qingkuai 框架" / "Qingkuai 框架"
- "scaffold" / "bootstrap" / "create app"

---

## Primary References

- docs://getting-started/installation.md

Read docs first, then provide commands.

---

## Hard Rules

1. For new project initialization, **always prefer `create-qingkuai`** unless user explicitly asks for manual bootstrap.
2. Before giving commands, **must call `get_qingkuai_project_bootstrap_guide` first**.
3. Then call `search_qingkuai_docs` with install/init/scaffold keywords and read matched `docs://...` entries.
4. Before final commands, check CLI usage with `npm create qingkuai -- --help` to avoid stale flags.
5. Do not provide manual file-by-file initialization (`mkdir + package.json + src`) when official scaffolding is applicable.
6. Do not invent setup commands not present in docs.
7. If user constraints conflict with docs, state the conflict and provide a docs-aligned alternative.
