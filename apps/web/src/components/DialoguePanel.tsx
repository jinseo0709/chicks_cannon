import type { JSX } from 'react';
import type { StageDefinition } from '../game/types';

export interface DialoguePanelProps {
  story: StageDefinition['story'];
  onContinue(): void;
}

export function DialoguePanel({ story, onContinue }: DialoguePanelProps): JSX.Element {
  return (
    <div className="overlay-backdrop dialogue-backdrop">
      <section className="story-panel" role="dialog" aria-modal="true" aria-labelledby="story-speaker">
        <div className="story-avatar" aria-hidden="true">{story.avatar}</div>
        <div className="story-copy">
          <p className="eyebrow">골목의 도전장</p>
          <h2 id="story-speaker">{story.speaker}</h2>
          <p>{story.text}</p>
          <p className="chick-reply">{story.chickReply}</p>
          <button className="button button-primary" onClick={onContinue}>도전 시작</button>
        </div>
      </section>
    </div>
  );
}
