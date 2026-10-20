import type { JSX } from 'react';
import type { GameSnapshot, ItemKind } from '../game/types';

export interface GameHudProps {
  snapshot: GameSnapshot;
  onRestart(): void;
  onMute(): void;
  onUseItem(kind: ItemKind): void;
  onTogglePause(): void;
}

const activeStates = new Set(['AIMING', 'FLYING', 'RESOLVING']);

export function GameHud({ snapshot, onRestart, onMute, onUseItem, onTogglePause }: GameHudProps): JSX.Element {
  const ammoSlots = snapshot.stage === 1 || snapshot.stage === 2 ? 3 : 4;
  const canUseQuake = activeStates.has(snapshot.state);
  return (
    <div className="game-hud" role="region" aria-label="게임 정보">
      <div className="hud-topline">
        <div className="hud-left">
          <div className="hud-card chapter-card">
            <span className="hud-kicker">CHAPTER {snapshot.stage}</span>
            <strong>{snapshot.form.name}</strong>
            <span className="hud-score">점수 {snapshot.score.toLocaleString('ko-KR')}</span>
          </div>
          <div className="hud-card ammo-card" aria-label={`남은 병아리 ${snapshot.ammo}개`}>
            <span className="hud-kicker">탄환</span>
            <div className="ammo-dots" aria-hidden="true">
              {Array.from({ length: ammoSlots }, (_, index) => (
                <span key={index} className={index < snapshot.ammo ? 'ammo-dot' : 'ammo-dot spent'}>
                  {index < snapshot.ammo ? snapshot.form.avatar : '·'}
                </span>
              ))}
            </div>
            {snapshot.ammo === 0 && <span className="ammo-empty">탄환을 모두 썼어요</span>}
          </div>
        </div>
        <div className="item-tray" aria-label="사용 아이템">
          <button className="item-button" aria-label={`치즈 로켓, 남은 ${snapshot.items.booster}개`} disabled={!snapshot.items.booster || snapshot.state !== 'FLYING'} onClick={() => onUseItem('booster')}>
            <span aria-hidden="true">🚀</span><span className="item-label">치즈 로켓</span><b>{snapshot.items.booster}</b>
          </button>
          <button className="item-button" aria-label={`달걀 지진, 남은 ${snapshot.items.quake}개`} disabled={!snapshot.items.quake || !canUseQuake} onClick={() => onUseItem('quake')}>
            <span aria-hidden="true">🥚</span><span className="item-label">달걀 지진</span><b>{snapshot.items.quake}</b>
          </button>
          <button className="item-button" aria-label={`거대화, 남은 ${snapshot.items.mega}개`} disabled={!snapshot.items.mega || snapshot.state !== 'AIMING'} onClick={() => onUseItem('mega')}>
            <span aria-hidden="true">🔨</span><span className="item-label">거대화</span><b>{snapshot.items.mega}</b>
          </button>
        </div>
        <div className="hud-actions">
          <button className="icon-button" onClick={onMute} aria-label={snapshot.muted ? '소리 켜기' : '소리 끄기'}>
            {snapshot.muted ? '🔇' : '🔊'}
          </button>
          {([...activeStates, 'PAUSED'].includes(snapshot.state)) && (
            <button className="icon-button" onClick={onTogglePause} aria-label={snapshot.state === 'PAUSED' ? '계속하기' : '일시정지'}>
              {snapshot.state === 'PAUSED' ? '▶' : 'Ⅱ'}
            </button>
          )}
          <button className="icon-button" onClick={onRestart} aria-label="현재 챕터 다시 시작">↻</button>
        </div>
      </div>
    </div>
  );
}
