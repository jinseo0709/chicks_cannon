import type { JSX } from 'react';
import { assetUrl } from '../asset-url';
import type { StageDefinition } from '../game/types';
import type { GameStage } from '../game/types';

export interface DialoguePanelProps {
  story: StageDefinition['story'];
  stage?: GameStage;
  onContinue(): void;
}

export function DialoguePanel({ story, stage = 1, onContinue }: DialoguePanelProps): JSX.Element {
  const catAsset = stage === 6 ? 'boss' : stage >= 2 ? 'shield' : 'normal';
  return (
    <div className="overlay-backdrop dialogue-backdrop">
      <section className="story-panel" role="dialog" aria-modal="true" aria-labelledby="story-speaker">
        <img className="story-avatar-image" src={assetUrl(`assets/cats/${catAsset}.png`)} alt="" />
        <div className="story-copy">
          <p className="eyebrow">CHAPTER {stage} · 도전장</p>
          <h2 id="story-speaker">{story.speaker}</h2>
          <p>{story.text}</p>
          <p className="stage-instruction">{story.instruction}</p>
          <p className="chick-reply">{story.chickReply}</p>
          <button className="button button-primary" onClick={onContinue}>도전 시작</button>
        </div>
      </section>
    </div>
  );
}
