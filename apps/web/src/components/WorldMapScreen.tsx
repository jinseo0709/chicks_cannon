import type { CSSProperties, JSX } from 'react';
import { assetUrl } from '../asset-url';
import { CHICK_FORMS, STAGE_ORDER } from '../game/constants';
import { STAGES } from '../game/stages';
import type { GameStage } from '../game/types';

const NODE_POSITIONS: Readonly<Record<GameStage, { left: number; top: number }>> = {
  1: { left: 24.5, top: 76 },
  2: { left: 28.3, top: 48.5 },
  3: { left: 45.2, top: 30.5 },
  4: { left: 71.3, top: 43.5 },
  5: { left: 83.2, top: 33.4 },
  6: { left: 91.4, top: 15.3 },
};

export interface WorldMapScreenProps {
  completedStages: readonly GameStage[];
  unlockedStage: GameStage;
  onSelectStage(stage: GameStage): void;
  onBack(): void;
  onOpenLeaderboard(): void;
}

export function WorldMapScreen({
  completedStages,
  unlockedStage,
  onSelectStage,
  onBack,
  onOpenLeaderboard,
}: WorldMapScreenProps): JSX.Element {
  const completed = new Set(completedStages);
  const currentStage = completed.size === STAGE_ORDER.length ? 6 : unlockedStage;
  const currentForm = CHICK_FORMS[currentStage];

  return (
    <section className="world-map-screen" aria-labelledby="world-map-title">
      <img className="world-map-background" src={assetUrl('assets/map/world-map.png')} alt="여섯 지역이 길로 이어진 병아리 대포 월드맵" />
      <div className="world-map-shade" aria-hidden="true" />

      <header className="map-topbar">
        <button className="map-round-button" onClick={onBack} aria-label="홈으로 돌아가기">⌂</button>
        <div className="map-progress-card">
          <p>둥지 탈환 여정</p>
          <strong>{completed.size} / {STAGE_ORDER.length}</strong>
          <span><i style={{ width: `${(completed.size / STAGE_ORDER.length) * 100}%` }} /></span>
        </div>
        <button className="map-round-button map-trophy-button" onClick={onOpenLeaderboard} aria-label="순위표 열기">♛</button>
      </header>

      <div className="map-levels" aria-label="챕터 선택">
        {STAGE_ORDER.map((stage) => {
          const isCompleted = completed.has(stage);
          const isLocked = stage > unlockedStage;
          const isCurrent = !isCompleted && stage === currentStage;
          const position = NODE_POSITIONS[stage];
          const className = `map-level-node${isCompleted ? ' completed' : ''}${isCurrent ? ' current' : ''}${isLocked ? ' locked' : ''}`;
          return (
            <button
              key={stage}
              className={className}
              style={{ '--node-left': `${position.left}%`, '--node-top': `${position.top}%` } as CSSProperties}
              disabled={isLocked}
              onClick={() => onSelectStage(stage)}
              aria-label={`챕터 ${stage}, ${STAGES[stage].title}${isLocked ? ', 잠김' : isCompleted ? ', 완료' : ', 도전 가능'}`}
            >
              <span className="map-node-crown" aria-hidden="true">{isLocked ? '◆' : isCompleted ? '★' : '♢'}</span>
              <strong>{stage}</strong>
              <small>{isLocked ? '잠김' : isCompleted ? '완료' : '도전'}</small>
              <em>{STAGES[stage].title}</em>
            </button>
          );
        })}

        <img
          className="map-traveler"
          src={assetUrl(`assets/chicks/stage-${currentForm.assetVariant}.png`)}
          alt=""
          style={{ '--traveler-left': `${NODE_POSITIONS[currentStage].left}%`, '--traveler-top': `${NODE_POSITIONS[currentStage].top}%` } as CSSProperties}
        />
        <span className="map-evolution-marker evolution-one">깃털 진화</span>
        <span className="map-evolution-marker evolution-two">전설 진화</span>
      </div>

      <aside className="map-current-card">
        <img src={assetUrl(`assets/backgrounds/stage-${currentStage}.png`)} alt="" />
        <div>
          <p>다음 목적지 · CHAPTER {currentStage}</p>
          <h2 id="world-map-title">{STAGES[currentStage].title}</h2>
          <span>{currentForm.name} · {currentForm.skillName}</span>
        </div>
        <button className="button button-primary" onClick={() => onSelectStage(currentStage)}>
          {completed.has(currentStage) ? '다시 도전' : '출발하기'}
        </button>
      </aside>
    </section>
  );
}
