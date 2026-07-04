# YUYU AI Video Studio

YUYU is a static frontend demo for an AI video creation product. It runs directly from GitHub Pages and includes the main product flows as local browser interactions.

## Live Page

GitHub Pages:

```text
https://caicarton2402.github.io/yuyuai/
```

## Included Frontend Flows

- Explore home with prompt composer, model selector, multi-episode switch, category tabs, templates, and feature cards.
- Project center with search, create, duplicate, continue, and export actions.
- Asset center with character, scene, prop, and style tabs plus upload/import modal.
- Team collaboration with member list, invite modal, comments, and approval action.
- Account and membership dashboard with credits, queue, seat count, and usage ledger.
- Node canvas editor with add node, drag, zoom, auto layout, inspector edits, preview, and export.
- Global modal system, toast feedback, responsive desktop/tablet/mobile layout, and YUYU logo/branding.

## Backend And User System

The app now runs in two modes:

- Static mode on GitHub Pages, where all flows remain available as browser-side demo interactions.
- Backend mode with the local Node server, where users, sessions, workspace data, projects, assets, comments, queue items, credits, billing actions, and generation records are persisted to `data/db.json`.

Demo account created on first backend start:

```text
demo@yuyu.ai
Yuyu123456
```

Main API groups:

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET/PUT /api/workspace`
- `GET/POST/PATCH/DELETE /api/projects`
- `GET/POST /api/assets`
- `GET/POST /api/team/members`, `GET/POST /api/team/comments`
- `GET/POST/PATCH/DELETE /api/queue`
- `POST /api/billing/top-up`, `POST /api/billing/upgrade`
- `POST /api/generate`

## Local Run

Open `index.html` directly in a browser, or run:

```powershell
npm.cmd run serve
```

Then visit:

```text
http://127.0.0.1:5180/
```

To run the full frontend plus backend:

```powershell
npm.cmd run backend
```

Then visit:

```text
http://127.0.0.1:5180/
```

The frontend automatically detects `/api/health`. If the backend is online, use the account panel to log in, register, sync, or log out.

## QA

Run the complete repeatable check:

```powershell
npm.cmd run qa
```

The QA suite validates:

- Static file and branding checks.
- Local HTTP resources.
- Runtime console/network/image health in Chrome.
- Backend API registration/login/workspace persistence.
- Browser-level backend login and persisted comment flow.
- Full interaction flow across explore, projects, assets, team, account, and canvas.
- Headless render screenshot at `1920x863`.
- Responsive screenshots at `1920x1000`, `1440x1000`, `1024x1000`, `768x1000`, and `375x812`.

Evidence is written to:

```text
.qa/
replica/
replica/responsive/
diff/report.json
```
