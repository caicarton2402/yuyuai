# Seko Sensetime Canvas Clone

Local clone of the captured logged-in Seko infinite-canvas state.

## Open

Open `index.html` directly in a browser, or run:

```powershell
npm.cmd run serve
```

Then visit `http://127.0.0.1:5180/`.

To open the rebuilt DOM interaction layer directly, use:

```text
index.html?interactive=1
```

## QA

Run the complete repeatable check:

```powershell
npm.cmd run qa
```

This performs:

- Static file/content validation.
- Local HTTP resource checks.
- Runtime checks for console errors, JavaScript exceptions, network failures, and bad HTTP responses.
- Chrome headless screenshot at `1936x951`, cropped to the captured `1920x863` reference region.
- Pixel diff against `reference/seko-1920x863-top.png`.
- Interactive-layer screenshot and nonblank/different-from-default checks.
- Browser-level DOM interaction regression checks for zoom, mode switch, add node, drag, pan, and auto layout reset.
- Responsive runtime checks and screenshots at `1920x1000`, `1440x1000`, `1024x1000`, `768x1000`, and `375x812`.

Expected default-state diff:

- `changedPixels`: `0`
- `changedRatio`: `0.0`
- `maxChannelDelta`: `7`

Expected interactive-layer check:

- `size`: `1920x863`
- `nonDarkPixels`: greater than `100000`
- `changedFromDefaultPixels`: greater than `10000`

Expected DOM interaction check:

- `queryActivatesInteractiveLayer`: `true`
- `zoomInUpdatesLabel`: `true`
- `modeSwitchUpdatesState`: `true`
- `addToolCreatesPromptNode`: `true`
- `nodeDragMovesCard`: `true`
- `canvasPanUpdatesTransform`: `true`
- `autoLayoutRestoresCapturedState`: `true`

Responsive evidence is written to:

```text
replica/responsive/
```

Runtime evidence is written to:

```text
.qa/runtime-check.json
```

## Interaction Model

The page initially displays a captured pixel layer for exact visual parity. On first click, drag, zoom, or toolbar action, it fades into the rebuilt interactive canvas layer with draggable nodes, zoom controls, auto layout, and add-node behavior. `?interactive=1` starts directly in that rebuilt layer for QA.
