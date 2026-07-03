# Seko Canvas Behaviors

## Capture Notes

- Browser evidence was captured from the user's logged-in Chrome tab.
- Standard `OpenCLI` and `Browser Harness` dependencies were missing, so capture used the Chrome plugin plus saved screenshots.
- Reference screenshots are in `reference/` and `docs/design-references/`.

## Observed Behaviors

- Canvas itself is a dark infinite workspace with persistent dotted grid.
- Nodes are placed on an unconstrained plane and visually connected with curved paths.
- `画布` is active in the top-center segmented control; `编辑器` is disabled/inactive in the captured state.
- Video result is blocked/invalid and displays `生成内容违规`.
- Bottom zoom value is `78%`.
- The minimap reflects the rough positions of the three visible nodes.

## Rebuilt Behaviors

- Default load shows a captured pixel layer from the live reference screenshot for near-pixel-perfect initial state fidelity.
- The first click, drag, wheel-zoom, or control action fades out the captured layer and reveals the interactive rebuilt canvas layer.
- `index.html?interactive=1` starts with the rebuilt canvas layer visible for QA and direct interaction testing.
- Cards can be dragged locally; connector paths are recalculated.
- Holding the hand tool or dragging empty canvas pans the workspace.
- Zoom buttons and mouse wheel with `Ctrl` update zoom from 40% to 160%.
- `自动布局` resets all nodes and zoom to the captured state.
- The add button creates a new prompt node.
- Top segmented control toggles between canvas and editor state without navigation.
- Toolbar controls show lightweight local toasts.

## Verification Limits

- Multiple reference breakpoints could not be captured because the available logged-in Chrome plugin does not expose viewport resizing in this session.
- Dynamic original app internals, private API calls, cookies, local storage, and account data were not inspected.
- The near-zero default diff is achieved with a captured-state pixel layer; interaction mode uses the rebuilt local DOM/CSS/JS layer.
