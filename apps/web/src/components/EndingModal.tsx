import type { JSX } from 'react';
import type { LeaderboardClient } from '../leaderboard/client';
import { ScoreSubmissionPanel } from './ScoreSubmissionPanel';

export interface EndingModalProps {
  score: number;
  client: LeaderboardClient;
  storage: Storage;
  onPlayAgain(): void;
  onOpenLeaderboard(): void;
}

export function EndingModal({ score, client, storage, onPlayAgain, onOpenLeaderboard }: EndingModalProps): JSX.Element {
  return (
    <div className="overlay-backdrop">
      <section className="modal-card ending-modal" role="dialog" aria-modal="true" aria-labelledby="ending-title">
        <div className="modal-emoji" aria-hidden="true">🐣💛🏡</div>
        <p className="eyebrow">THE END · HOME AGAIN</p>
        <h2 id="ending-title">우리 둥지를 되찾았어요!</h2>
        <p className="final-score">최종 점수 <strong>{score.toLocaleString('ko-KR')}</strong></p>
        <ScoreSubmissionPanel score={score} completed={true} client={client} storage={storage} />
        <div className="modal-actions">
          <button className="button button-primary" onClick={onPlayAgain}>다시 모험하기</button>
          <button className="button button-secondary" onClick={onOpenLeaderboard}>전체 순위</button>
        </div>
      </section>
    </div>
  );
}
