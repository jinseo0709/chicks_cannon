import type { JSX } from 'react';
import type { GameSnapshot, ItemKind } from '../game/types';
import { STAGES } from '../game/stages';

export interface GameHudProps {
  snapshot: GameSnapshot;
  onRestart(): void;
  onMute(): void;
  onUseItem(kind: ItemKind): void;
  onTogglePause(): void;
}

const activeStates = new Set(['AIMING', 'FLYING', 'RESOLVING']);

export function GameHud({ snapshot, onRestart, onMute, onUseItem, onTogglePause }: GameHudProps): JSX.Element {
  const stage = STAGES[snapshot.stage];
  const active = activeStates.has(snapshot.state);
  const items: { kind: ItemKind; label: string; icon: string; available: boolean }[] = [
    { kind: 'booster', label: '치즈 로켓', icon: '🚀', available: snapshot.state === 'FLYING' },
    { kind: 'quake', label: '달걀 지진', icon: '🥚', available: active },
    { kind: 'mega', label: '거대화', icon: '🔨', available: snapshot.state === 'AIMING' },
    { kind: 'butter', label: '버터 스프레이', icon: '🧈', available: active },
  ];
  return (
    <div className="game-hud" role="region" aria-label="게임 정보" inert={!active} aria-hidden={!active}>
      <div id="top-bar" className="hud-topline">
        <div className="hud-card chapter-card">
          <span className="hud-kicker">CHAPTER {snapshot.stage}</span>
          <strong title={stage.title}>{stage.title}</strong>
          <span className="hud-score">점수 {snapshot.score.toLocaleString('ko-KR')}</span>
        </div>
        <div className="hud-card ammo-card" aria-label={`남은 병아리 ${snapshot.ammo}개`}>
          <span className="hud-kicker">탄환</span>
          <div className="ammo-dots" aria-hidden="true">
            {Array.from({ length: stage.ammo }, (_, index) => (
              <span key={index} className={index < snapshot.ammo ? 'ammo-dot' : 'ammo-dot spent'}>
                {index < snapshot.ammo
                  ? <img src={`/assets/chicks/stage-${snapshot.form.assetVariant}.png`} alt="" />
                  : '·'}
              </span>
            ))}
          </div>
          {snapshot.ammo === 0 && <span className="ammo-empty">탄환을 모두 썼어요</span>}
        </div>
        <div className="hud-actions">
          <button className={`icon-button ui-icon-button ${snapshot.muted ? 'ui-icon-muted' : 'ui-icon-sound'}`}
            onClick={onMute} disabled={!active} aria-label={snapshot.muted ? '소리 켜기' : '소리 끄기'} />
          <button className={`icon-button ui-icon-button ${snapshot.state === 'PAUSED' ? 'ui-icon-play' : 'ui-icon-pause'}`}
            onClick={onTogglePause} disabled={!active} aria-label={snapshot.state === 'PAUSED' ? '계속하기' : '일시정지'} />
          <button className="icon-button ui-icon-button ui-icon-restart" onClick={onRestart} disabled={!active} aria-label="현재 챕터 다시 시작" />
        </div>
      </div>
      <div id="item-bar" className="item-tray" aria-label="사용 아이템">
        {items.map((item) => (
          <button key={item.kind} className={`item-button${snapshot.targetingItem === item.kind ? ' selected' : ''}`}
            aria-label={`${item.label}, 남은 ${snapshot.items[item.kind]}개`}
            aria-pressed={item.kind === 'butter' ? snapshot.targetingItem === 'butter' : undefined}
            disabled={!active || !item.available || !snapshot.items[item.kind]}
            onClick={() => onUseItem(item.kind)}>
            <span aria-hidden="true">{item.icon}</span><span className="item-label">{item.label}</span><b>{snapshot.items[item.kind]}</b>
          </button>
        ))}
      </div>
    </div>
  );
}
