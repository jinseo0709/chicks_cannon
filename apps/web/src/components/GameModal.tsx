import type { JSX } from 'react';
import { assetUrl } from '../asset-url';
import type { GameSnapshot } from '../game/types';
import { ITEM_INFO, MAX_ITEM_COUNT, STAGE_CLEAR_REWARDS } from '../game/items';
import { STAGES } from '../game/stages';

export interface GameModalProps {
  snapshot: GameSnapshot;
  onRetry(): void;
  onNextStage(): void;
  onWorldMap(): void;
}

export function GameModal({ snapshot, onRetry, onNextStage, onWorldMap }: GameModalProps): JSX.Element | null {
  if (snapshot.state === 'WON') {
    return (
      <div className="overlay-backdrop clear-backdrop" role="status">
        <section className="clear-card">
          <img src={assetUrl('assets/story/chapter-clear.png')} alt="병아리가 고양이 장애물을 넘어 다음 길을 여는 모습" />
          <div className="clear-copy">
            <p className="eyebrow">CHAPTER CLEAR</p>
            <div className="clear-stars" role="img" aria-label={`Stage stars ${snapshot.stageStars} of 3`}>
              {Array.from({ length: 3 }, (_, index) => (
                <span key={index} className={index < snapshot.stageStars ? 'clear-star earned' : 'clear-star'} aria-hidden="true">
                  {index < snapshot.stageStars ? '\u2605' : '\u2606'}
                </span>
              ))}
            </div>
            <p className="clear-result">이번 판 점수 {snapshot.stageScore.toLocaleString('ko-KR')}점 · 별 3개 목표 {snapshot.scoreTarget.toLocaleString('ko-KR')}점</p>
            {snapshot.bonusChallengeStatus === 'success' && <div className="challenge-badge" role="status"><span aria-hidden="true">🏅</span> {STAGES[snapshot.stage].bonusChallenge.badge} 배지 · 시간 도전 +{STAGES[snapshot.stage].bonusChallenge.bonusScore}점</div>}
            <h2>길을 열었어요!</h2>
            <p>둥지를 향한 다음 모험이 곧 시작돼요.</p>
          </div>
        </section>
      </div>
    );
  }
  if (snapshot.state === 'EVOLUTION') {
    const form = snapshot.evolvedForm;
    const evolved = form?.formId !== snapshot.form.formId;
    const rewardKind = STAGE_CLEAR_REWARDS[snapshot.stage];
    const reward = rewardKind ? ITEM_INFO[rewardKind] : null;
    return (
      <div className="overlay-backdrop">
        <section className="modal-card evolution-modal" role="dialog" aria-modal="true" aria-labelledby="evolution-title">
          <p className="eyebrow">{evolved ? 'NEW EVOLUTION' : 'NEW ROUTE OPENED'}</p>
          <img className="evolution-avatar-image" src={assetUrl(`assets/chicks/stage-${form?.assetVariant ?? 1}.png`)} alt="" />
          <h2 id="evolution-title">{evolved ? '새로운 모습으로 진화!' : '다음 길이 열렸어요!'}</h2>
          <h3>{form?.name}</h3>
          <p><strong>{form?.skillName}</strong> · {form?.skillDesc}</p>
          {reward && rewardKind && <div className="item-reward-card" role="status">
            <span className="item-reward-icon" aria-hidden="true">{reward.icon}</span>
            <span><strong>스테이지 클리어 보상</strong><br />{reward.label} 1개 획득! <small>가방 {snapshot.items[rewardKind]}/{MAX_ITEM_COUNT}</small></span>
          </div>}
          <div className="clear-actions">
            <button className="button button-primary" onClick={onNextStage}>다음 스테이지</button>
            <button className="button button-secondary" onClick={onWorldMap}>월드맵</button>
          </div>
        </section>
      </div>
    );
  }
  if (snapshot.state === 'LOST') {
    const hostage = snapshot.defeatCause === 'hostage';
    return (
      <div className="overlay-backdrop">
        <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="defeat-title">
          <img className="modal-status-image" src={assetUrl(hostage ? 'assets/props/egg.png' : 'assets/cats/normal.png')} alt="" />
          <p className="eyebrow">다시 해볼까요?</p>
          <h2 id="defeat-title">{hostage ? '인질 달걀이 깨졌어요' : '둥지 탈환에 실패했어요'}</h2>
          <p>{hostage ? '아기 달걀을 지키면서 요새를 공략해 주세요.' : '대포 탄환을 모두 소진했어요. 다른 각도로 도전해 보세요.'}</p>
          <button className="button button-primary" onClick={onRetry}>챕터 다시 도전</button>
        </section>
      </div>
    );
  }
  return null;
}
