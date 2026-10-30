# Task: T01 Build Regional Map Pages

## Status: done

## Goal
Replace the six-node map with four browsable regional pages, each showing exactly five numbered stages, their completion/star/badge state, and an unambiguous current-stage card.

## Decision Summary
- Four regions are presented as pages, one region at a time.
- Each page shows only that region's five stages, with previous/next navigation.
- Stage availability remains sequential and is independent from which page the player is viewing.

## Implementation

### I01. Implement regional page navigation and five-node layout
- Related Files:
  - `apps/web/src/components/WorldMapScreen.tsx` :: props, region selection, stage nodes, progress, current card; modify.
  - `apps/web/src/styles.css` :: map region header/navigation/node layout and responsive behavior; modify.
  - `apps/web/src/components/WorldMapScreen.test.tsx` :: page navigation and node display; modify.
  - `apps/web/src/game/constants.ts` :: `REGION_ORDER`, `REGIONS`; read-only after P01.
- Details
  - Add optional `selectedRegion: RegionId` and `onSelectRegion(region: RegionId): void` props. Parent owns selection so leaving and returning to map retains page for current app session. Keep `completedStages`, `bestStars`, `challengeBadges`, `unlockedStage`, and `onSelectStage` props.
  - Derive the five visible stage IDs from `STAGE_ORDER.filter(stage => stage >= region.firstStage && stage <= region.lastStage)`; never create a second hard-coded list of nodes.
  - Render heading from `REGIONS[region].title` plus `지역 N / 4`; render exactly five `.map-level-node` buttons, numbered with global campaign stage IDs and annotated with each stage title. Preserve completed/current/locked classes and star/badge display.
  - Previous and next buttons are labeled `이전 지역` and `다음 지역`; disable at region 1 and 4. They call `onSelectRegion` with adjacent `REGION_ORDER` item. Add `aria-label="지역 선택"`, `aria-current="page"` for active page indicator, and stable `aria-label` on each node including stage number, title, locked/completed state, stars, badge.
  - Selected region page remains navigable even if it contains only locked levels. Clicking a locked node does not invoke `onSelectStage`; only IDs `<= unlockedStage` or already completed are selectable. Replay of completed stages remains allowed.
  - Replace static six-entry `NODE_POSITIONS` with five positions indexed locally in each page: `(18%,70%)`, `(34%,42%)`, `(50%,58%)`, `(66%,36%)`, `(82%,62%)`. Use local node index, not global stage, for placement.
  - Current card stage is the first incomplete stage (`unlockedStage`) if it belongs to selected region; otherwise use first incomplete stage in the campaign for the global resume card. Once campaign is complete use stage 20. The card explicitly indicates if it belongs to another region and offers a button to jump to that region.
  - Keep existing `world-map.png` background; add a distinct region name/color treatment using `REGIONS[region].backgroundStage` or region ID in a CSS class so each page is visually identified without introducing art assets. Keep layout within viewport and support existing mobile breakpoint: nav remains visible, node buttons at least 44px target, no horizontal overflow.
  - Progress bar remains campaign-wide and displays `{completedCount} / 20`; stars and challenge badges remain stage-specific.
- Execution Flow / Logic
  1. Parent initializes selected region to the unlocked stage's region.
  2. User navigates pages; page changes do not alter campaign progress.
  3. Selecting unlocked/completed node fires `onSelectStage(stage)`; locked selection is inert.
  4. After stage clear, parent can set the selected page to the newly unlocked stage's region.

### I02. Verify the map is readable and keyboard-operable
- Related Files:
  - `apps/web/src/components/WorldMapScreen.test.tsx` :: map assertions; modify.
- Details
  - Test all four region labels, 5 nodes per page (15 star slots), boundary disabled nav buttons, navigation preserving completion state, locked stage no callback, replay allowed, active region's unlock and final completed stage 20, progress 0/20 and 20/20, focusable controls and descriptive accessible labels.

## Acceptance Criteria
- [x] Map displays one region and exactly five global stage nodes at a time.
- [x] Region navigation works at boundaries and does not modify completion/unlock state.
- [x] Stars, badges, lock state, current stage card, and global 20-stage progress remain correct.
- [x] Map tests pass and mobile layout has no horizontal overflow.

## Validation
- `npm.cmd test --workspace @chicks-cannon/web -- WorldMapScreen.test.tsx` — all four page states and interaction cases pass.

## Commit Message
```text
feat(map): add four regional campaign pages

Plan: 2026-10-29-expand-campaign-to-20-stages
Phase: P03-regional-world-map
Task: T01-build-regional-map-pages

- Show five stage nodes on each regional page
- Add accessible previous and next region navigation
```

## Progress
- [x] Implementation complete
- [x] Validation passed: 9 map tests, 3 app tests, build, and 390×844 mobile overflow check passed.
- commit: `8c07e19` (`feat(map): 4개 지역 스테이지 페이지 추가`)
