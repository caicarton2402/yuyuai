# YUYU Canvas Page Topology

Target: captured AI video canvas state customized for the YUYU brand.

Capture basis: `reference/yuyu-current-viewport.png` at `1920x863`.

## Global Frame

- Full-viewport infinite canvas application.
- Dark near-black dotted grid background.
- Fixed overlays sit above the canvas: top bar, left tool rail, minimap, bottom zoom bar, right floating assistant button.
- Main content is a node graph positioned on a large freeform plane.

## Fixed Overlays

- Top-left brand mark and story title: `未命名故事`.
- Top-center segmented control: active `画布`, inactive `编辑器`.
- Top-right account pill: credit value `5980`, membership `标准会员`.
- Left tool rail: create, folder/assets, actor/reference, prompt/material controls.
- Bottom-left minimap with `自动布局` pill.
- Bottom toolbar: view/grid/hand/tools controls, zoom controls showing `78%`, keyboard helper button.
- Right floating red assistant/language pill.

## Canvas Nodes

- Character image node: label starts with `1779931305633_e652q06h_image_imag...`; card has large portrait image with rounded dark border.
- Location reference node: label `位置参考图`; wide sketch card beneath character card.
- Video node: label `视频`; black output card showing `生成内容违规`.
- Two curved connector paths flow from the image/reference nodes into the video node.

## Interaction Model

- Primary model: freeform canvas with draggable cards and zoom/pan affordances.
- Top segment switches visual mode locally.
- Zoom control updates the canvas scale.
- Auto layout returns nodes to the captured reference positions.
- Add control creates a small placeholder prompt node.
