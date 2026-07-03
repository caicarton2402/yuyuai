# Responsive QA

## Scope

The live logged-in reference was captured only at desktop `1920x863`, so the default pixel-perfect diff remains desktop-only. This responsive pass validates the rebuilt interactive layer locally across the standard pixel-clone viewport set.

## Command

```powershell
npm.cmd run qa:responsive
```

The script opens `/?interactive=1` through local HTTP, drives Chrome via CDP, saves viewport screenshots, and verifies DOM/runtime state.

## Viewport Evidence

| Viewport | Name | Screenshot | Result |
| --- | --- | --- | --- |
| `1920x1000` | desktop-wide | `replica/responsive/yuyu-1920x1000-desktop-wide.png` | Pass |
| `1440x1000` | desktop | `replica/responsive/yuyu-1440x1000-desktop.png` | Pass |
| `1024x1000` | tablet-landscape | `replica/responsive/yuyu-1024x1000-tablet-landscape.png` | Pass |
| `768x1000` | tablet | `replica/responsive/yuyu-768x1000-tablet.png` | Pass |
| `375x812` | mobile | `replica/responsive/yuyu-375x812-mobile.png` | Pass |

## Assertions

- Interactive layer is active and the captured pixel layer is hidden.
- Zoom starts at `78%`.
- Three captured nodes exist.
- All required images load with nonzero natural dimensions.
- Both connector SVG paths are generated.
- Top bar, mode switch, tool rail, bottom controls, and assistant button remain visible.
- Mobile layout hides minimap, keyboard helper, and account pill below `720px`.
- Screenshots are nonblank and contain bright UI/content pixels.

## Latest Result

- `ok`: `true`
- Report: `.qa/responsive-check.json`
- Screenshot folder: `replica/responsive/`
