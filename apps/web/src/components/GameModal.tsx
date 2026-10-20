import type { JSX } from 'react';
import type { GameSnapshot } from '../game/types';

export interface GameModalProps {
  snapshot: GameSnapshot;
  onRetry(): void;
  onContinue(): void;
}

export function GameModal({ snapshot, onRetry, onContinue }: GameModalProps): JSX.Element | null {
  if (snapshot.state === 'WON') {
    return <div className="win-toast" role="status">둥지 탈환 성공! 다음 모험이 열려요 💛</div>;
  }
  if (snapshot.state === 'EVOLUTION') {
    const form = snapshot.evolvedForm;
    return (
      <div className="overlay-backdrop">
        <section className="modal-card evolution-modal" role="dialog" aria-modal="true" aria-labelledby="evolution-title">
          <p className="eyebrow">NEW EVOLUTION</p>
          <div className="evolution-avatar" aria-hidden="true">{form?.avatar}</div>
          <h2 id="evolution-title">새로운 모습으로 진화!</h2>
          <h3>{form?.name}</h3>
          <p><strong>{form?.skillName}</strong> · {form?.skillDesc}</p>
          <button className="button button-primary" onClick={onContinue}>다음 챕터로</button>
        </section>
      </div>
    );
  }
  if (snapshot.state === 'LOST') {
    const hostage = snapshot.defeatCause === 'hostage';
    return (
      <div className="overlay-backdrop">
        <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="defeat-title">
          <div className="modal-emoji" aria-hidden="true">{hostage ? '🥚💔' : '😿'}</div>
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
