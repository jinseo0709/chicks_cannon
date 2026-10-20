import type { JSX } from 'react';

export interface PausePanelProps {
  onResume(): void;
  onRestart(): void;
}

export function PausePanel({ onResume, onRestart }: PausePanelProps): JSX.Element {
  return (
    <div className="overlay-backdrop pause-backdrop">
      <section className="modal-card pause-panel" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        <p className="eyebrow">잠깐 쉬어가기</p>
        <h2 id="pause-title">게임 일시정지</h2>
        <p>준비되면 모험을 이어가세요.</p>
        <div className="modal-actions">
          <button className="button button-primary" onClick={onResume}>계속하기</button>
          <button className="button button-secondary" onClick={onRestart}>현재 챕터 다시 시작</button>
        </div>
      </section>
    </div>
  );
}
