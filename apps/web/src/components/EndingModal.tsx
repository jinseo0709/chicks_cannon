import type { JSX } from 'react';
import { assetUrl } from '../asset-url';
import type { LeaderboardClient } from '../leaderboard/client';
import type { ItemCounts, ItemKind } from '../game/types';
import { ITEM_INFO, MAX_ITEM_COUNT } from '../game/items';
import { ScoreSubmissionPanel } from './ScoreSubmissionPanel';

export interface EndingModalProps {
  score: number;
  client: LeaderboardClient;
  storage: Storage;
  items: ItemCounts;
  finalRewardClaimed: boolean;
  onClaimReward(kind: ItemKind): void;
  onPlayAgain(): void;
  onOpenLeaderboard(): void;
  onReturnToMap?(): void;
}

export function EndingModal({ score, client, storage, items, finalRewardClaimed, onClaimReward, onPlayAgain, onOpenLeaderboard, onReturnToMap }: EndingModalProps): JSX.Element {
  return (
    <div className="overlay-backdrop">
      <section className="modal-card ending-modal" role="dialog" aria-modal="true" aria-labelledby="ending-title">
        <img className="ending-hero" src={assetUrl('assets/chicks/stage-4.png')} alt="황금 깃털로 진화한 병아리" />
        <p className="eyebrow">THE END · HOME AGAIN</p>
        <h2 id="ending-title">우리 둥지를 되찾았어요!</h2>
        <p className="final-score">최종 점수 <strong>{score.toLocaleString('ko-KR')}</strong></p>
        <section className="final-item-reward" aria-labelledby="final-item-reward-title">
          <h3 id="final-item-reward-title">🎁 마지막 보상 꾸러미</h3>
          {finalRewardClaimed ? <p role="status">아이템을 가방에 담았어요!</p> : <>
            <p>원하는 아이템 하나를 골라요. 종류별 최대 {MAX_ITEM_COUNT}개까지 담을 수 있어요.</p>
            <div className="final-item-choices">
              {(Object.keys(ITEM_INFO) as ItemKind[]).map((kind) => {
                const item = ITEM_INFO[kind];
                const full = items[kind] >= MAX_ITEM_COUNT;
                return <button key={kind} type="button" disabled={full} onClick={() => onClaimReward(kind)}
                  aria-label={`${item.label} 보상 선택, 현재 ${items[kind]}개${full ? ', 가득 참' : ''}`}>
                  <span aria-hidden="true">{item.icon}</span><strong>{item.label}</strong><small>{items[kind]}/{MAX_ITEM_COUNT}</small>
                </button>;
              })}
            </div>
          </>}
        </section>
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
