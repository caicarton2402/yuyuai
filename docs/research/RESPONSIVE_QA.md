# Responsive QA

`scripts/responsive-check.mjs` captures both explore and project center screenshots at:

- `1920x1000`
- `1440x1000`
- `1024x1000`
- `768x1000`
- `375x812`

For each viewport it checks:

- Explore hero, prompt box, category tabs, templates, feature section, and navigation are visible.
- Project center renders project cards after route switching.
- Expected control counts are stable.
- There is no horizontal overflow.

Screenshots are written to `replica/responsive/`.
