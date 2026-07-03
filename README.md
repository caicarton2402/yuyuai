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

## Boundary

This repository is a deployable static frontend. Authentication, billing, storage, real video generation, private model APIs, and production downloads are mocked in the browser so the page can run on GitHub Pages.

## Local Run

Open `index.html` directly in a browser, or run:

```powershell
npm.cmd run serve
```

Then visit:

```text
http://127.0.0.1:5180/
```

## QA

Run the complete repeatable check:

```powershell
npm.cmd run qa
```

The QA suite validates:

- Static file and branding checks.
- Local HTTP resources.
- Runtime console/network/image health in Chrome.
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
