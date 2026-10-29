# Decisions: Pulling Chick Expression and Game BGM

- Date: 2026-10-29
- Status: Confirmed

## D01. Chick expression while pulling
- **Chosen**: Draw a procedural effort expression over the loaded chick while the sling is being pulled. Increase the squint and blush with pull distance; restore the normal sprite immediately on release or cancel.
- **Rationale**: The game already renders the loaded chick from a canvas snapshot and has multiple chick forms. A canvas overlay works across every form without adding or replacing art assets.

## D02. Background music style
- **Chosen**: Warm, playful adventure music with gentle plucked notes, bell-like accents, a soft bass pulse, and light percussion.
- **Rationale**: This supports the cute storybook setting while keeping the music unobtrusive during puzzle play.

## D03. Music implementation and controls
- **Chosen**: Synthesize a short looping arrangement with the existing Web Audio system. Start only after the first existing user-gesture audio unlock; respect mute, pause, and disposal.
- **Rationale**: This avoids a third-party dependency and a large external audio asset, and follows the current browser autoplay handling and sound controls.
