# Redesign Stage Variety

- Date: 2026-10-30
- Status: Confirmed

## D01. Stage identity
- **Chosen**: Give every stage a distinct structure silhouette and a distinct primary attack solution. Reuse and combine regional gimmicks to preserve familiarity.
- **Rationale**: The current campaign repeats the shared `fort()` footprint, especially in later regions, making the stage count feel larger than the gameplay variety.

## D02. Campaign continuity
- **Chosen**: Keep the confirmed 20-stage campaign, four regions of five stages, region-based chick forms, stage 6 mid-boss, stage 20 final boss, existing narrative, and current progression flow.
- **Rationale**: The redesign targets encounter identity while preserving the campaign structure and story already established.

## D03. Mechanics and rewards
- **Chosen**: Keep the existing gimmick set and region signature gimmicks. Recompose gimmicks around each stage's primary solution. Preserve each stage's ammo, timer, reward and challenge intent where practical; update attack-route hints and score targets when the new layout changes them.
- **Rationale**: A different arrangement should create a new decision without requiring new physics systems or disrupting the campaign's reward curve.

## D04. Layout authoring
- **Chosen**: Replace repeated generic fort compositions with hand-authored or purpose-built layout patterns. Each stage must differ in both its dominant silhouette and the target/sequence suggested by its attack routes.
- **Rationale**: Small coordinate changes to the same pair of towers do not address the reported lack of variety.

## D05. Validation expectations
- **Chosen**: Review all 20 layouts as a campaign, check spawn bounds and score-target consistency, and verify the web build and relevant game tests before committing implementation work.
- **Rationale**: Layout diversity must not introduce unreachable targets, broken stage clear conditions, or score goals that no longer match available rewards.
