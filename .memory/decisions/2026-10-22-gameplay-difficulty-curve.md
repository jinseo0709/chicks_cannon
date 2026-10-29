# Decisions: Gameplay Difficulty Curve

- Date: 2026-10-22
- Status: Confirmed

## D01. Difficulty progression
- **Chosen**: Keep the six-stage campaign. Introduce one main gimmick at a time and combine the learned gimmicks in the finale.
- **Rationale**: Players get a safe chance to understand each new mechanic before the campaign asks them to use several together.

## D02. Main gimmick order
- **Chosen**: Stage 1 teaches basic block structures; Stage 2 introduces shielded cats; Stage 3 introduces fan currents; Stage 4 introduces moving shutters; Stage 5 introduces TNT chains; Stage 6 combines the boss with earlier gimmicks.
- **Rationale**: The sequence moves from basic aiming to defensive, environmental, timing, and chain-reaction challenges before a final exam.

## D03. Ammunition curve
- **Chosen**: Give stages one and two six shots each, stages three and four five shots each, stage five four shots, and stage six five shots.
- **Rationale**: Early stages allow one or two mistakes. Late stages put more pressure on shot choice, with one extra shot reserved for the boss encounter.

## D04. Item supply
- **Chosen**: Refill one charge of each existing support item at the start of every stage. Refill them again on every retry.
- **Rationale**: Players can experiment with items to learn each mechanic without permanently losing support after a failed attempt.

## D05. Structure layout
- **Chosen**: Build each stage around one large fort and a smaller auxiliary structure. Allow multiple attack angles and physical chain reactions, including surprising collapses.
- **Rationale**: Varied structures reward experimentation and make successful shots feel expressive.

## D06. Damage feedback
- **Chosen**: Show damage progression on blocks by material: cracks in wood, spreading cracks in glass, and chipped corners in stone.
- **Rationale**: Players can read which parts of a structure are weakening without persistent health bars or hidden hit points.

## D07. Support hazards
- **Chosen**: Keep tires, rotating gears, and swinging chandeliers as auxiliary hazards in later stages. They should not compete with the stage's main lesson.
- **Rationale**: The additional physics objects keep late structures varied while preserving a clear primary gimmick.

## D08. Gimmick instruction
- **Chosen**: Add a one-line explanation of each new main gimmick to the existing stage-start dialogue, and make its first encounter safe to try.
- **Rationale**: Reuse the existing dialogue flow and let players learn through play without a separate tutorial screen.

## D09. Egg objective
- **Chosen**: Keep the existing eggs as breakable objects, but do not fail the stage when one breaks. Subtract 500 points from the current stage score, to a minimum of zero.
- **Rationale**: Eggs add a consequence while keeping cat elimination as the main goal.

## D10. Stage stars
- **Chosen**: Award one star for clearing a stage, two stars for clearing with at least one shot left, and three stars for clearing with at least half the shots left and meeting that stage's score target.
- **Rationale**: The first star rewards completion; higher ratings reward efficiency and a strong chain reaction.

## D11. Three-star score target
- **Chosen**: Set a separate score target for each stage. A good clear that defeats all cats and triggers one strong chain reaction should be enough; destroying every block is not required.
- **Rationale**: Stars reward skilled play without turning total destruction into a mandatory chore.

## D12. Score display
- **Chosen**: Show the current stage score and progress toward its three-star target prominently in the HUD. Show campaign total score in a smaller secondary treatment.
- **Rationale**: Players can understand the immediate star goal while retaining the existing campaign score.

## D13. Star feedback and persistence
- **Chosen**: Show stars earned in the clear scene and show the best star rating for each stage on the world map. Persist best ratings with the existing browser progress data.
- **Rationale**: Players receive immediate feedback and can see which stages are worth replaying.

## D14. Retry score handling
- **Chosen**: On retry, roll the campaign total back to its value when the current stage began; discard points from the failed attempt. Refill the stage's items.
- **Rationale**: Failed attempts should not inflate the campaign score, and retries should start with the same resources.

## D15. Completed-stage replay
- **Chosen**: Replaying a completed stage may improve its best star rating but must not add the replay score again to the campaign total.
- **Rationale**: This keeps the campaign leaderboard from rewarding repeated farming of one stage.

## D16. Score scope
- **Chosen**: Calculate star score targets from points earned in the current stage, not the campaign total.
- **Rationale**: Earlier stages should not grant later stages free stars.
