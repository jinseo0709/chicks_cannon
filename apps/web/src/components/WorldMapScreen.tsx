import type { CSSProperties, JSX } from 'react';
import { assetUrl } from '../asset-url';
import { CHICK_FORMS, REGIONS, REGION_ORDER, STAGE_ORDER } from '../game/constants';
import { STAGES } from '../game/stages';
import type { GameStage, RegionId } from '../game/types';
import type { CampaignProgress } from '../game/progress';

const NODE_POSITIONS = [
  { left: 18, top: 70 },
  { left: 34, top: 42 },
  { left: 50, top: 58 },
  { left: 66, top: 36 },
  { left: 82, top: 62 },
] as const;

export interface WorldMapScreenProps {
  completedStages: readonly GameStage[];
  bestStars: CampaignProgress['bestStars'];
  challengeBadges: readonly GameStage[];
  unlockedStage: GameStage;
  selectedRegion: RegionId;
  onSelectRegion(region: RegionId): void;
  onSelectStage(stage: GameStage): void;
  onBack(): void;
  onOpenLeaderboard(): void;
}

export function WorldMapScreen({
  completedStages,
  bestStars,
  challengeBadges,
  unlockedStage,
  selectedRegion,
  onSelectRegion,
  onSelectStage,
  onBack,
  onOpenLeaderboard,
}: WorldMapScreenProps): JSX.Element {
  const completed = new Set(completedStages);
  const currentStage = completed.size === STAGE_ORDER.length ? STAGE_ORDER[STAGE_ORDER.length - 1] : unlockedStage;
  const currentRegion = STAGES[currentStage].region;
  const region = REGIONS[selectedRegion];
  const regionStages = STAGE_ORDER.filter((stage) => stage >= region.firstStage && stage <= region.lastStage);
  const cardOnThisPage = currentRegion === selectedRegion;
  const pageMarkerStage = cardOnThisPage
    ? currentStage
    : completed.has(region.lastStage) ? region.lastStage : region.firstStage;
  const pageMarkerIndex = regionStages.indexOf(pageMarkerStage);
  const currentForm = CHICK_FORMS[currentStage];
  const regionIndex = REGION_ORDER.indexOf(selectedRegion);

  return (
    <section className={`world-map-screen region-${selectedRegion}`} aria-labelledby="world-map-title">
      <img className="world-map-background" src={assetUrl('assets/map/world-map.png')} alt="네 지역을 잇는 병아리 대포 월드맵" />
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

      <nav className="map-region-nav" aria-label="지역 선택">
        <button className="map-region-arrow" onClick={() => onSelectRegion(REGION_ORDER[regionIndex - 1])}
          disabled={regionIndex === 0} aria-label="이전 지역">‹</button>
        <div className="map-region-current" aria-current="page">
          <span>REGION {selectedRegion} · {regionIndex + 1} / {REGION_ORDER.length}</span>
          <h1 id="world-map-title">{region.title}</h1>
        </div>
        <button className="map-region-arrow" onClick={() => onSelectRegion(REGION_ORDER[regionIndex + 1])}
          disabled={regionIndex === REGION_ORDER.length - 1} aria-label="다음 지역">›</button>
      </nav>

      <div className="map-levels" aria-label={`${region.title} 스테이지 선택`}>
        {regionStages.map((stage, index) => {
          const isCompleted = completed.has(stage);
          const isLocked = stage > unlockedStage && !isCompleted;
          const isCurrent = !isCompleted && stage === currentStage;
          const position = NODE_POSITIONS[index];
          const className = `map-level-node${isCompleted ? ' completed' : ''}${isCurrent ? ' current' : ''}${isLocked ? ' locked' : ''}`;
          const stars = bestStars[stage] ?? 0;
          const hasBadge = challengeBadges.includes(stage);
          const stateLabel = isLocked ? '잠김' : isCompleted ? '완료' : '도전 가능';
          return (
            <button
              key={stage}
              className={className}
              style={{ '--node-left': `${position.left}%`, '--node-top': `${position.top}%` } as CSSProperties}
              disabled={isLocked}
              onClick={() => onSelectStage(stage)}
              aria-label={`스테이지 ${stage}, ${STAGES[stage].title}, ${stateLabel}, 별 ${stars}개${hasBadge ? ', 도전 배지 획득' : ''}`}
            >
              <span className="map-node-crown" aria-hidden="true">{isLocked ? '🔒' : isCompleted ? '👑' : '✦'}</span>
              <strong>{stage}</strong>
              {hasBadge && <span className="map-challenge-badge" aria-label={`${STAGES[stage].bonusChallenge.badge} 배지 획득`}>🏅</span>}
              <span className="map-node-stars" role="img" aria-label={`Stage ${stage} best stars ${stars} of 3`}>
                {Array.from({ length: 3 }, (_, starIndex) => (
                  <span key={starIndex} className={starIndex < stars ? 'map-star earned' : 'map-star'} aria-hidden="true">
                    {starIndex < stars ? '\u2605' : '\u2606'}
                  </span>
                ))}
              </span>
              <small>{stateLabel}</small>
              <em>{STAGES[stage].title}</em>
            </button>
          );
        })}

        <img
          className="map-traveler"
          src={assetUrl(`assets/chicks/stage-${CHICK_FORMS[pageMarkerStage].assetVariant}.png`)}
          alt=""
          style={{ '--traveler-left': `${NODE_POSITIONS[pageMarkerIndex].left}%`, '--traveler-top': `${NODE_POSITIONS[pageMarkerIndex].top}%` } as CSSProperties}
        />
      </div>

      <aside className={`map-current-card${cardOnThisPage ? '' : ' other-region'}`}>
        <img src={assetUrl(`assets/backgrounds/stage-${REGIONS[currentRegion].backgroundStage}.png`)} alt="" />
        <div>
          <p>{cardOnThisPage ? '다음 목적지' : `${REGIONS[currentRegion].title} 지역의 현재 스테이지`} · CHAPTER {currentStage}</p>
          <h2>{STAGES[currentStage].title}</h2>
          <span>{currentForm.name} · {currentForm.skillName}</span>
        </div>
        <button className="button button-primary" onClick={() => cardOnThisPage ? onSelectStage(currentStage) : onSelectRegion(currentRegion)}>
          {cardOnThisPage ? completed.has(currentStage) ? '다시 도전' : '출발하기' : `${REGIONS[currentRegion].title}로 이동`}
        </button>
      </aside>
    </section>
  );
}
