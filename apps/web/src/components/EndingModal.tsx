import type { JSX } from 'react';
import { assetUrl } from '../asset-url';
import type { LeaderboardClient } from '../leaderboard/client';
import { ScoreSubmissionPanel } from './ScoreSubmissionPanel';

export interface EndingModalProps {
  score: number;
  client: LeaderboardClient;
  storage: Storage;
  onPlayAgain(): void;
  onOpenLeaderboard(): void;
  onReturnToMap?(): void;
}

export function EndingModal({ score, client, storage, onPlayAgain, onOpenLeaderboard, onReturnToMap }: EndingModalProps): JSX.Element {
  return (
    <div className="overlay-backdrop">
      <section className="modal-card ending-modal" role="dialog" aria-modal="true" aria-labelledby="ending-title">
        <img className="ending-hero" src={assetUrl('assets/chicks/stage-4.png')} alt="황금 깃털로 진화한 병아리" />
        <p className="eyebrow">THE END · HOME AGAIN</p>
        <h2 id="ending-title">우리 둥지를 되찾았어요!</h2>
        <p className="final-score">최종 점수 <strong>{score.toLocaleString('ko-KR')}</strong></p>
        <ScoreSubmissionPanel score={score} completed={true} client={client} storage={storage} />
        <div className="modal-actions">
          {onReturnToMap && <button className="button button-primary" onClick={onReturnToMap}>완성된 월드맵 보기</button>}
          <button className="button button-secondary" onClick={onPlayAgain}>처음부터 다시</button>
          <button className="button button-secondary" onClick={onOpenLeaderboard}>전체 순위</button>
        </div>
      </section>
    </div>
  );
}
