# Agora

Private personal build. Not open-source, not distributed. A personal fork of [AionUi](https://github.com/iOfficeAI/AionUi) (Apache-2.0), heavily customised for my own use — peer network, metrics panel, scheduled tasks, Claude-only agents, LaTeX rendering, custom deploy.

> This repo is mine alone. No releases, no community, no support channels, no contribution flow. The original AionUi marketing readme lived here; it's been removed because none of it applies to a private build.

## Layout

Electron app, two processes — never mix their APIs:

| Process  | Path                             | Restriction  |
| -------- | -------------------------------- | ------------ |
| Main     | `packages/desktop/src/process/`  | No DOM APIs  |
| Renderer | `packages/desktop/src/renderer/` | No Node APIs |

IPC bridge: `packages/desktop/src/preload/`. Agent/AI conventions: [CLAUDE.md](CLAUDE.md).

## Common commands

```bash
bun run test              # vitest
bunx tsc --noEmit         # typecheck
just push                 # lint → format → typecheck → test → push
scripts/deploy.sh "msg"   # build arm64 + install into /Applications (run OUTSIDE Agora)
```

> Deploy quits and relaunches Agora. Run `deploy.sh` from a plain Terminal, never from inside an Agora session, or it kills its own parent.

## Upstream

Forked from AionUi (Apache-2.0). License retained in [LICENSE](LICENSE).
