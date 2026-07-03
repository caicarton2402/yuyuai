# YUYU Full Site Clone Scope

## Goal
Build a complete YUYU-branded frontend clone of the logged-in AI video creation site experience. The clone keeps the visual language and user flow style while replacing all original naming and logo usage with YUYU.

## Boundary
- Real backend services, authentication, billing, storage, model inference, and proprietary APIs are mocked locally.
- User-facing flows must still behave like a product: every visible primary control opens a panel, changes state, creates mock data, or advances a workflow.
- The clone must run as a static frontend from `index.html` and GitHub Pages.

## Core Areas
1. Explore home
   - Prompt composer
   - Four prompt tool buttons: upload, asset, mention, style
   - Model selector
   - Multi-episode toggle
   - Category tabs: overseas short drama, comic drama, music MV, knowledge sharing
   - Template selection
   - Featured function cards

2. Project center
   - Recent projects
   - Status indicators: draft, generating, ready
   - Continue, duplicate, and export actions
   - Search/filter UI

3. Asset center
   - Character, scene, prop, and style asset tabs
   - Upload/import modal
   - Reusable asset cards
   - Add-to-current-project behavior

4. Account and membership
   - Credits display
   - Membership tier summary
   - Usage ledger
   - Notification center
   - Team/collaboration controls

5. Generation workflow
   - Story planning
   - Character and scene extraction
   - Shot list generation
   - Video generation progress
   - Result preview and export

6. Canvas editor
   - Node-based canvas view
   - Prompt, character, scene, shot, video, and export nodes
   - Dragging, zooming, panning, selection
   - Right-side inspector
   - Timeline/storyboard strip
   - Preview modal

7. Global shell
   - Side navigation
   - Floating assistant and translator
   - Toast feedback
   - Modal system
   - Responsive desktop/tablet/mobile layout

## Verification
- `npm.cmd run qa` must cover initialization, local resources, runtime errors, full-site interaction flow, render screenshot, and responsive layouts.
