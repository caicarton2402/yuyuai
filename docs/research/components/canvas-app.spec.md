# CanvasApp Specification

## Overview

- Target file: `index.html`, `src/styles.css`, `src/app.js`
- Screenshot: `docs/design-references/yuyu-current-viewport.png`
- Interaction model: drag, pan, zoom, click-driven overlay controls

## Visual Tokens

- Background: `#0d0d0e`
- Grid dot: `rgba(255,255,255,0.08)` at 16px spacing
- Panel background: `rgba(28,28,30,0.82)`
- Card background: `#070707`
- Card border: `rgba(255,255,255,0.12)`
- Primary text: `#f5f6f7`
- Secondary text: `#a7abb3`
- Muted text: `#6f747d`
- Accent gold: `#f1c56c`
- Assistant red: `#c54a67`
- Typeface: system UI stack, matching captured Chrome-rendered CJK UI.

## Layout

- Base canvas: `1920x863`.
- Character node: left `510`, top `54`, media `284x420`.
- Reference node: left `399`, top `540`, media `505x280`.
- Video node: left `1021`, top `333`, media `501x281`.
- Left tool rail: fixed left `15`, top `355`, width `55`, height `191`.
- Minimap: fixed left `15`, top `646`, width `201`, height `153`.
- Bottom toolbar: fixed left `15`, top `806`, width `273`, height `42`.

## Assets

- `public/assets/character-card-image.png`
- `public/assets/location-reference-image.png`

The video card is rebuilt as native HTML/CSS to preserve the blocked-state text and loading icon while remaining interactive.

## States

- Default zoom: `78%`.
- Active mode: `画布`.
- Dragging a card updates its position and connector paths.
- Dragging the empty canvas pans the whole graph.
- `自动布局` returns to default positions.

## Responsive Behavior

- Desktop: preserves captured `1920x863` coordinate space.
- Tablet/mobile: scales the full workspace to fit while keeping the same topology.
- Controls remain fixed and compact; card text uses ellipsis to avoid overflow.
