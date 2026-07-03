# Runtime QA

`scripts/runtime-check.mjs` launches a local static server and a clean headless Chrome profile. It verifies:

- YUYU branding is present.
- Original source-site branding is not visible in served HTML/CSS/JS runtime text.
- Explore starts as the active view.
- Route, prompt tool, category, template, feature, project, asset, team, and ledger modules render.
- Canvas and modal layers start hidden.
- Images load with nonzero dimensions.
- Console errors, runtime exceptions, failed requests, and HTTP 400+ responses are absent.
