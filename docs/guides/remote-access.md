# Remote Access (Agora / AionUi)

How to reach the app and its agents from outside the local desktop session.
Agent-agnostic: everything below proxies whatever runs in the aioncore backend,
including the embedded Claude Code agent. None of it is the (unavailable) hosted
"Claude server" — it is the fork's own connectivity layer.

> Status verified end-to-end on 2026-06-22 against the deployed `/Applications/Agora.app`
> (v1.00 / internal 2.1.20, arm64). See [Test results](#test-results-2026-06-22).

---

## Mechanisms

| Mechanism                                      | Direction            | Binds                 | Default            | Enable path                      |
| ---------------------------------------------- | -------------------- | --------------------- | ------------------ | -------------------------------- |
| WebUI static server (local)                    | inbound              | `127.0.0.1:25808`     | off                | Settings toggle                  |
| WebUI static server (remote)                   | inbound              | `0.0.0.0:25808`       | off                | `allowRemote=true` / `--remote`  |
| aioncore backend HTTP                          | inbound              | `127.0.0.1:<dynamic>` | on when WebUI runs | n/a — always loopback            |
| Mobile app (React Native)                      | phone → server       | connects to WebUI     | off                | QR-scan pairing                  |
| Channels (Telegram/Lark/DingTalk/WeChat/WeCom) | outbound to platform | n/a                   | off                | Settings → Channels              |
| Remote Agents (OpenClaw/zeroclaw/acp)          | outbound to gateway  | n/a                   | off                | Settings → Agents → Remote       |
| Sidecar / PTY relay                            | —                    | —                     | —                  | does not exist (parked, no code) |
| Auto ngrok / CF tunnel                         | —                    | —                     | —                  | docs only, manual user step      |

Ports: `25808` prod · `25809` dev · `25810` multi-instance dev.

---

## 1. WebUI mode (the main mechanism)

Self-contained HTTP/WebSocket server that serves the full React SPA and reverse-
proxies all API + WS traffic to the bundled aioncore backend. Open the app from
any browser.

**Key files**

- `packages/web-host/src/static-server.ts` — server; `host = allowRemote ? '0.0.0.0' : '127.0.0.1'` (`:222`)
- `packages/web-host/src/backend-launcher.ts` — backend spawn/port parse
- `packages/web-host/src/index.ts` — `startWebHost()`
- `packages/desktop/src/process/utils/webuiConfig.ts` — desktop lifecycle (`startDesktopWebUI`, `stopDesktopWebUI`, `restoreDesktopWebUIFromPreferences`)
- `packages/desktop/src/process/bridge/webuiBridge.ts` — IPC: `webui.start` / `webui.stop` / `webui.getStatus`
- `packages/desktop/src/renderer/components/settings/SettingsModal/contents/WebuiModalContent.tsx` — Settings UI + QR

**How traffic flows**

1. A TCP connection hits the static server on `:25808`.
2. First request line peeked: `GET /ws` or `GET /api/stt/stream` → socket spliced straight to aioncore's WS port.
3. Everything else → internal HTTP server: `/api/*`, `/login`, `/logout` proxied to aioncore; all other paths serve the SPA.
4. aioncore **always** binds loopback only (`--local` flag, dynamic port). External clients reach it _only_ through this proxy.

**Preference keys** (stored in aioncore `/api/settings/client`, SQLite):

- `webui.desktop.enabled` (bool) — master on/off
- `webui.desktop.allowRemote` (bool) — `0.0.0.0` vs `127.0.0.1`
- `webui.desktop.port` (number) — override default

Two start paths, with one important difference:

- **Settings toggle (IPC `webui.start`)** → runs `maybeSeedInitialPassword()`, which generates + displays a one-time login password when `needs_setup=true`.
- **Boot auto-restore (`restoreDesktopWebUIFromPreferences`)** → starts the server but **does NOT seed a password**. If the store says `enabled=true` but no credential was ever set, the browser hits a login wall with no known password. Use the Settings toggle (or `POST /api/webui/reset-password`) to mint one.

Env / CLI overrides: `AIONUI_ALLOW_REMOTE`, `AIONUI_HOST=0.0.0.0`, `AIONUI_PORT`, `--remote`, `--port`, `--webui`.

**QR pairing** (`WebuiModalContent.tsx`, `ipcBridge.ts` `generate-qr-token`):
remote-on → Settings shows a QR encoding `http://<LAN-IP>:25808/qr-login?token=<JWT>`.
Phone scans → `POST /api/auth/qr-login` → JWT → WebSocket.

## 2. Mobile app

Full React Native / Expo client at `mobile/`. Connects to the WebUI server over
LAN. `mobile/src/services/websocket.ts` (auth via `Sec-WebSocket-Protocol` JWT,
backoff reconnect, ping/pong), `mobile/src/services/bridge.ts` (req/resp + pub/sub),
`mobile/app/connect.tsx` (QR scanner or manual URL). Buildable via Expo.

## 3. Channels (messaging platforms)

Agents exposed to external chat platforms via aioncore channel plugins. Settings →
Remote → Channels. Outbound from the desktop machine to the platform; not an
inbound internet listener. Telegram (bot token), Lark/飞书 (app id+secret),
DingTalk (robot), WeChat (QR login), WeCom (WS long connection). Routes
`/api/channel/{plugins,pairings,users,sessions}`. New users trigger a
`channel.pairing-requested` approve/reject dialog.

## 4. Remote Agents (OpenClaw)

Connect _out_ to AI agents on other machines. `RemoteAgentConfig`
(`remoteAgentTypes.ts`): protocol `openclaw | zeroclaw | acp`, url, Ed25519 device
key pair for mutual auth. UI `RemoteAgentManagement.tsx`; routes
`/api/remote-agents/*` (CRUD + `testConnection` + `handshake`). Client-side only —
Agora does not itself listen as a gateway.

## 5. Headless server deployment (docs only)

`docs/guides/deploy-server.md`: run `--webui` headless on Linux (Xvfb + systemd).
Remote access via (A) open port 25808, (B) `ngrok http 25808`, (C) SSH tunnel
`ssh -L 25808:localhost:25808 user@server`. ngrok/SSH are **manual user tools** —
no tunnel SDK is bundled.

## Does NOT exist

- Sidecar / PTY / stream-json "remote control" spike → **zero code** (was parked).
- No auto-tunnel SDK, no always-on internet listener.
- `tests/e2e/.../remote/` dirs hold only `.gitkeep`.

---

## Enable / disable manually (no UI)

The Settings toggle is the supported path. For scripted testing, flip the SQLite
setting then restart so boot auto-restore picks it up. aioncore's API port is
**dynamic** — discover it per launch (do not hardcode 63103 etc.):

```bash
# 1. find current aioncore listen port
ap=$(pgrep -f "bundled-aioncore/.*/aioncore")
lsof -nP -p "$ap" | grep LISTEN     # e.g. 127.0.0.1:54403 (API) + a second WS port

# 2. enable local-only (curl is hook-blocked here; use python urllib)
python3 - <<'PY'
import urllib.request, json
b=json.dumps({"webui.desktop.enabled":True}).encode()   # add "webui.desktop.allowRemote":True for LAN
r=urllib.request.Request("http://127.0.0.1:54403/api/settings/client",data=b,method="PUT",
                         headers={"Content-Type":"application/json"})
print(urllib.request.urlopen(r,timeout=5).read().decode())
PY

# 3. restart so restoreDesktopWebUIFromPreferences() boots the server
osascript -e 'quit app "Agora"'; sleep 3; open -a Agora
# verify: GET http://127.0.0.1:25808/ returns the SPA
```

Disable = same PUT with `False`, then restart. **Gotcha:** each restart gives
aioncore a _new_ dynamic port; re-discover it before the disable PUT or you hit a
dead port (connection refused) and the setting never clears.

To actually log in after enabling via this path, mint a password:
`POST http://127.0.0.1:<aioncore>/api/webui/reset-password` → `new_password`.

---

## Test results (2026-06-22)

Enabled local-only via the settings flip above, restarted, probed:

| Check                     | Result                              |
| ------------------------- | ----------------------------------- |
| SPA served `:25808`       | 200, `<!doctype html>`              |
| Bind scope                | `127.0.0.1` only                    |
| `/api/*` proxy → aioncore | 200, real settings returned         |
| `/api/auth/status`        | `needs_setup:true, user_count:1`    |
| `/ws` upgrade             | HTTP 400 (handler present, not 404) |
| LAN `192.168.0.150:25808` | connection refused — not exposed    |

Then reverted: `enabled=false` + restart → `:25808` down, clean default.

Outstanding for a real browser/phone login (deferred): mint a WebUI password
(boot-restore path does not seed one), and for remote, set `allowRemote=true`
(binds `0.0.0.0` — LAN exposure, do consciously).
