import type { JSX } from 'react';
import { assetUrl } from '../asset-url';
import type { GameSnapshot } from '../game/types';
import { ITEM_INFO, MAX_ITEM_COUNT, STAGE_CLEAR_REWARDS } from '../game/items';
import { REGIONS } from '../game/constants';
import { STAGES } from '../game/stages';
import { ItemIcon } from './ItemIcon';

export interface GameModalProps {
  snapshot: GameSnapshot;
  onRetry(): void;
  onNextStage(): void;
  onWorldMap(): void;
}

export function GameModal({ snapshot, onRetry, onNextStage, onWorldMap }: GameModalProps): JSX.Element | null {
  if (snapshot.state === 'WON') return null;
  if (snapshot.state === 'EVOLUTION') {
    if (REGIONS[STAGES[snapshot.stage].region].lastStage !== snapshot.stage) return null;
    const form = snapshot.evolvedForm;
    const evolved = form?.formId !== snapshot.form.formId;
    const rewardKind = STAGE_CLEAR_REWARDS[snapshot.stage];
    const reward = rewardKind ? ITEM_INFO[rewardKind] : null;
    return (
      <div className="overlay-backdrop">
        <section className="modal-card evolution-modal" role="dialog" aria-modal="true" aria-labelledby="evolution-title">
          <p className="eyebrow">NEW REGION UNLOCKED</p>
          <img className="evolution-avatar-image" src={assetUrl(`assets/chicks/stage-${form?.assetVariant ?? 1}.png`)} alt="" />
          <h2 id="evolution-title">새 지역이 열렸어요!</h2>
          {snapshot.bonusChallengeStatus === 'success' && <div className="challenge-badge" role="status"><span aria-hidden="true">🏅</span> {STAGES[snapshot.stage].bonusChallenge.badge} 배지 · 시간 도전 +{STAGES[snapshot.stage].bonusChallenge.bonusScore}점</div>}
          <h3>{form?.name}</h3>
          <p>{evolved && '새로운 모습으로 진화했어요! '}<strong>{form?.skillName}</strong> · {form?.skillDesc}</p>
          {reward && rewardKind && <div className="item-reward-card" role="status">
            <span className="item-reward-icon" aria-hidden="true"><ItemIcon kind={rewardKind} /></span>
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
    const timedOut = snapshot.defeatCause === 'timer';
    return (
      <div className="overlay-backdrop">
        <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="defeat-title">
          <img className="modal-status-image" src={assetUrl(hostage ? 'assets/props/egg.svg' : 'assets/cats/normal.png')} alt="" />
          <p className="eyebrow">다시 해볼까요?</p>
          <h2 id="defeat-title">{hostage ? '인질 달걀이 깨졌어요' : timedOut ? '시간이 다 됐어요' : '둥지 탈환에 실패했어요'}</h2>
          <p>{hostage ? '후반 스테이지에서는 달걀을 지켜야 해요.' : timedOut ? '시간 안에 고양이들을 모두 쓰러뜨리지 못했어요. 다시 공략해 보세요.' : '탄환을 모두 소진했어요. 다른 각도로 도전해 보세요.'}</p>
          <button className="button button-primary" onClick={onRetry}>챕터 다시 도전</button>
        </section>
      </div>
    );
  }
  return null;
}
