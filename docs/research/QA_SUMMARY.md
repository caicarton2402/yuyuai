# YUYU QA Summary

## Current Gate

Run:

```powershell
npm.cmd run qa
```

The suite covers:

- Static file, branding, route, and selector validation.
- HTTP 200 checks for the app, CSS, JS, helper script, logo, favicon, and explore media assets.
- Chrome runtime checks for console errors, JavaScript exceptions, failed requests, broken images, original-brand leakage, and initialized module counts.
- DOM interaction checks across explore, project center, asset center, team, account, and canvas editor.
- Render screenshot and nonblank pixel check at `1920x863`.
- Responsive screenshots and layout checks at five breakpoints.

## Evidence

- `.qa/runtime-check.json`
- `.qa/interactive-dom-check.json`
- `.qa/responsive-check.json`
- `.qa/render-and-diff.json`
- `replica/yuyu-fullsite-1920x863-top.png`
- `replica/responsive/`
- `diff/report.json`
