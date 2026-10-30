import type { JSX } from 'react';
import { assetUrl } from '../asset-url';
import type { StageDefinition } from '../game/types';
import type { GameStage } from '../game/types';
import { STAGES } from '../game/stages';

export interface DialoguePanelProps {
  story: StageDefinition['story'];
  stage?: GameStage;
  onContinue(): void;
}

export function DialoguePanel({ story, stage = 1, onContinue }: DialoguePanelProps): JSX.Element {
  const isBoss = Boolean(STAGES[stage].bossRole);
  const catAsset = isBoss ? 'boss' : stage >= 2 ? 'shield' : 'normal';
  const attackRoutes = STAGES[stage].attackRoutes;
  return (
    <div className="overlay-backdrop dialogue-backdrop">
      <section className={`story-panel ${isBoss ? 'boss-story-panel' : ''}`} role="dialog" aria-modal="true" aria-labelledby="story-speaker">
        <img className="story-avatar-image" src={assetUrl(`assets/cats/${catAsset}.png`)} alt="" />
        <div className="story-copy">
          <p className="eyebrow">CHAPTER {stage} · 도전장</p>
          <h2 id="story-speaker">{story.speaker}</h2>
          <p>{story.text}</p>
          <p className="stage-instruction">{story.instruction}</p>
          <div className="attack-route-list" aria-label="공략 경로 두 가지">
            {attackRoutes.map((route, index) => (
              <p className="attack-route-hint" key={route.name}>
                <b>{index + 1}. {route.name}</b><span>{route.hint}</span>
              </p>
            ))}
          </div>
          <p className="chick-reply">{story.chickReply}</p>
          <button className="button button-primary" onClick={onContinue}>도전 시작</button>
        </div>
      </section>
    </div>
  );
}
