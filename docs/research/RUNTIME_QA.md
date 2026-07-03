# Runtime QA

## Scope

This pass verifies the local clone is clean at runtime, not only visually correct in screenshots.

## Command

```powershell
npm.cmd run qa:runtime
```

The script starts a local HTTP server, opens Chrome through CDP, and inspects both:

- `/`
- `/?interactive=1`

## Assertions

- No `console.error` events.
- No JavaScript runtime exceptions.
- No network loading failures.
- No `4xx` or `5xx` HTTP responses.
- Required images load with nonzero natural dimensions.
- Canvas nodes initialize.
- Connector paths initialize.

## Latest Result

- `ok`: `true`
- Default page: `pixelOpacity` is `1`, three nodes, two connector paths.
- Interactive page: `pixelOpacity` is `0`, three nodes, two connector paths.
- Report: `.qa/runtime-check.json`
