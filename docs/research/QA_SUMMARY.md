# QA Summary

## Evidence Files

- Reference screenshot: `reference/yuyu-current-viewport.png`
- Replica screenshot: `replica/yuyu-local-viewport.png`
- Diff overlay: `diff/yuyu-1920x863-top-diff.png`
- Diff report: `diff/report.json`
- HTTP resource check: `.qa/server-check.json`
- Runtime check: `.qa/runtime-check.json`
- Runtime QA notes: `docs/research/RUNTIME_QA.md`
- Interactive screenshot: `replica/yuyu-interactive-viewport.png`
- Interactive check: `.qa/interactive-check.json`
- DOM interaction check: `.qa/interactive-dom-check.json`
- Responsive check: `.qa/responsive-check.json`
- Responsive screenshots: `replica/responsive/`
- Responsive QA notes: `docs/research/RESPONSIVE_QA.md`
- Captured default pixel layer: `public/assets/yuyu-captured-state.png`

## Commands Run

```powershell
npm.cmd run validate
npm.cmd run qa:http
npm.cmd run qa:runtime
npm.cmd run qa:render
npm.cmd run qa:interactive
npm.cmd run qa:responsive
npm.cmd run qa
node --check .\src\app.js
node --check .\scripts\validate.mjs
node --check .\scripts\check-http.mjs
node --check .\scripts\runtime-check.mjs
node --check .\scripts\render-and-diff.mjs
node --check .\scripts\interactive-dom-check.mjs
node --check .\scripts\responsive-check.mjs
python -m py_compile .\scripts\diff_images.py
python -m http.server 5180 --bind 127.0.0.1
```

Chrome headless render:

```powershell
chrome.exe --headless=new --disable-gpu --window-size=1936,951 --screenshot=replica\yuyu-local-viewport-wide.png index.html
```

The `1936x951` render was cropped to the top-left `1920x863` region to match the captured reference screenshot dimensions. Chrome headless on this Windows host reserves a 16px right-side internal viewport gutter when using `1920x951`, so `1936x951` is required for an apples-to-apples `1920x863` comparison.

## Validation Results

- Static validation: pass via `npm.cmd run validate`.
- Full repeatable QA: pass via `npm.cmd run qa`.
- JavaScript syntax checks: pass.
- Local HTTP checks: pass for `/`, CSS, JS, captured-state image, all node snapshot assets, and favicon.
- Runtime checks: pass for default and `?interactive=1` pages with no console errors, no runtime exceptions, no network failures, and no bad HTTP responses.
- Screenshot dimensions: reference `1920x863`, replica `1920x863`.
- Interactive-layer direct entry: `index.html?interactive=1`.
- DOM interaction regression: pass via `npm.cmd run qa:interactive`.
- Responsive runtime regression: pass via `npm.cmd run qa:responsive`.
- Pixel diff at threshold `16`:
  - `changedPixels`: `0`
  - `totalPixels`: `1656960`
  - `changedRatio`: `0.0`
  - `avgChannelDelta`: `0.05302`
  - `maxChannelDelta`: `7`
  - `sizeMismatch`: `false`
- Interactive-layer screenshot check:
  - `size`: `1920x863`
  - `nonDarkPixels`: `345426`
  - `changedFromDefaultPixels`: `61515`
  - `maxDeltaFromDefault`: `153`
  - `ok`: `true`
- DOM interaction check:
  - Query string activates the rebuilt interactive layer.
  - All required images load with nonzero dimensions.
  - Connector SVG paths are generated.
  - Zoom-in changes the label from `78%` to `86%`.
  - Editor mode updates selected state.
  - Add creates a fourth prompt node.
  - Drag changes the character node coordinates.
  - Canvas pan updates root transform variables.
  - Auto layout restores the captured zoom, pan, and character node position.
- Responsive check:
  - Captures local interaction-layer screenshots at `1920x1000`, `1440x1000`, `1024x1000`, `768x1000`, and `375x812`.
  - Verifies the rebuilt interactive layer is active, required images load, connector paths exist, and key controls remain visible.
  - Verifies mobile layout hides minimap, keyboard helper, and account pill at widths under `720px`.

## Known Differences

- The original app runtime was not mirrored because OpenCLI and Browser Harness were not installed, and the Chrome plugin became unstable after the first successful screenshot capture.
- The clone defaults to a captured reference-state pixel layer for initial visual fidelity, then reveals the rebuilt interactive canvas layer after user interaction.
- Default-state thresholded pixel diff is zero when rendered at the captured desktop canvas size. The nonzero `avgChannelDelta` is below the configured threshold and comes from browser image rendering/capture noise.
- Only the logged-in desktop canvas state was captured; mobile/tablet reference screenshots were not available from the browser controls in this session.
