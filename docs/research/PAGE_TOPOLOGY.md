# YUYU Full Site Page Topology

## Global Shell

- Fixed left navigation on desktop, bottom navigation on mobile.
- YUYU logo uses `public/assets/yuyu-logo.png`.
- Account credit pill, notification action, floating YUYU assistant, toast layer, modal layer, and workspace panel are global.

## Views

1. Explore
   - Hero prompt composer.
   - Four prompt tools: upload, asset, mention, style.
   - Model selector, multi-episode switch, send action.
   - Creation category tabs and two templates per category.
   - Featured function cards for blank canvas, effects, video, grid, and panorama.

2. Project Center
   - Search bar.
   - New project and open-canvas actions.
   - Project cards with progress, duplicate, continue, and export actions.

3. Asset Center
   - Asset tabs for characters, scenes, props, and styles.
   - Upload/import actions.
   - Selectable asset cards and add-to-project workflow.

4. Team Collaboration
   - Member list.
   - Invite modal.
   - Comment feed and approval action.

5. Account
   - Credits, membership tier, generation queue, and team seats.
   - Usage ledger.

6. Canvas Editor
   - Full-screen editor overlay.
   - Tool rail, top actions, node graph surface, inspector, and timeline.
   - Prompt, character, shot, and video nodes are connected visually.

## Interaction Model

- Single-page static frontend.
- Route buttons switch visible views with local state.
- Primary controls either open a modal, mutate mock data, update the workspace workflow, or open the canvas editor.
- Canvas nodes can be selected, dragged, edited, zoomed, reset, previewed, and exported.
