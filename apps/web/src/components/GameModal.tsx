import type { JSX } from 'react';
import { assetUrl } from '../asset-url';
import type { GameSnapshot } from '../game/types';

export interface GameModalProps {
  snapshot: GameSnapshot;
  onRetry(): void;
  onContinue(): void;
}

export function GameModal({ snapshot, onRetry, onContinue }: GameModalProps): JSX.Element | null {
  if (snapshot.state === 'WON') {
    return (
      <div className="overlay-backdrop clear-backdrop" role="status">
        <section className="clear-card">
          <img src={assetUrl('assets/story/chapter-clear.png')} alt="병아리가 고양이 장애물을 넘어 다음 길을 여는 모습" />
          <div className="clear-copy">
            <p className="eyebrow">CHAPTER CLEAR</p>
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
    return (
      <div className="overlay-backdrop">
        <section className="modal-card evolution-modal" role="dialog" aria-modal="true" aria-labelledby="evolution-title">
          <p className="eyebrow">{evolved ? 'NEW EVOLUTION' : 'NEW ROUTE OPENED'}</p>
          <img className="evolution-avatar-image" src={assetUrl(`assets/chicks/stage-${form?.assetVariant ?? 1}.png`)} alt="" />
          <h2 id="evolution-title">{evolved ? '새로운 모습으로 진화!' : '다음 길이 열렸어요!'}</h2>
          <h3>{form?.name}</h3>
          <p><strong>{form?.skillName}</strong> · {form?.skillDesc}</p>
          <button className="button button-primary" onClick={onContinue}>월드맵에서 확인</button>
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
