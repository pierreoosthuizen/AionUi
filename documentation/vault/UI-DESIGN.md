---
title: Agora — UI Design
version: 1.0
created: 2026-06-26
updated: 2026-06-26
tags:
  - agora
  - ui-design
---

# Agora — UI Design

## Brand

- **Name:** Agora
- **Palette:** Semantic tokens defined in `uno.config.ts` and CSS vars — never hardcode colours
- **Icons:** `@icon-park/react` exclusively
- **No raw HTML interactive elements** (`<button>`, `<input>`, `<select>`) — use Arco Design components only

## Design System

- **Component library:** `@arco-design/web-react`
- **Utilities:** UnoCSS (`uno.config.ts`) — utility-first; complex layouts → CSS Modules
- **Arco overrides:** `renderer/styles/arco-override.css`
- **Component-scoped Arco overrides:** CSS Module `:global()` in `Name.module.css`
- **Global styles:** `renderer/styles/` only

## Screen Inventory

| Screen | Purpose | Notes |
| ------ | ------- | ----- |
| Chat | Primary conversation interface | Agent selector, model picker, message stream |
| Skills | Skill browser and filter | Grouped list, show/hide filter, tab refresh (REQ-027) |
| Settings | App configuration | LLM providers, display, system, skills |
| Metrics | Usage dashboard | 7-day plan%, peer counts, conversations |

## User Flows

### Model switching
1. User opens chat with an active ACP agent
2. `AcpModelSelector` reads `available_models` from aioncore handshake
3. Dropdown lists all available models; current model highlighted
4. Selection updates `current_model_id` via ACP

### Skill invocation
1. User types `/<skill-name>` in prompt
2. Skill loaded via `Skill` tool
3. Skill instructions presented; user follows or redirects

## Accessibility

- Arco Design provides baseline keyboard nav and ARIA
- No specific WCAG target set (personal tool)

---

## Related Documents

- [[DOMAIN]] — User personas and context
- [[ARCHITECTURE]] — Technical constraints on UI
