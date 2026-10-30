import type { JSX } from 'react';
import { assetUrl } from '../asset-url';
import type { GameSnapshot, ItemKind } from '../game/types';
import { STAGES } from '../game/stages';
import { ITEM_INFO } from '../game/items';
import { CHICK_SKILL_RANGE } from '../game/constants';
import { ItemIcon } from './ItemIcon';

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
  const isBoss = Boolean(stage.bossRole);
  const active = activeStates.has(snapshot.state);
  const targetProgress = snapshot.scoreTarget > 0
    ? Math.max(0, Math.min(100, Math.floor((snapshot.stageScore / snapshot.scoreTarget) * 100)))
    : 0;
  const challengeSeconds = Math.ceil(snapshot.bonusChallengeRemainingMs / 1000);
  const challengeRunning = snapshot.bonusChallengeStatus === 'running';
  const flyingChick = snapshot.entities.find((entity) => entity.kind === 'chick' && !entity.projectile && entity.alive);
  const skillTargetNearby = Boolean(flyingChick && snapshot.entities.some((entity) =>
    entity.kind === 'cat' && entity.alive && Math.hypot(entity.x - flyingChick.x, entity.y - flyingChick.y) <= CHICK_SKILL_RANGE,
  ));
  const items: { kind: 'booster' | 'quake' | 'mega' | 'butter'; available: boolean; shortcut: string }[] = [
    { kind: 'booster', available: snapshot.state === 'AIMING' || snapshot.state === 'FLYING', shortcut: '1' },
    { kind: 'quake', available: active, shortcut: '2' },
    { kind: 'mega', available: snapshot.state === 'AIMING', shortcut: '3' },
    { kind: 'butter', available: active, shortcut: '4' },
  ];
  return (
    <div className="game-hud" role="region" aria-label="게임 정보" inert={!active} aria-hidden={!active}>
      <div id="top-bar" className={`hud-topline ${isBoss ? 'boss-mode' : ''}`}>
        <div className="hud-left-group">
          <div className="hud-card score-card hud-score-panel" aria-label="이번 스테이지 점수">
            <div className="hud-row-top">
              <span className="hud-chapter-name"><span>CHAPTER {snapshot.stage}</span><span className="hud-stage-title"> · {stage.title}</span></span>
              <span className={`hud-timer-badge ${challengeRunning && challengeSeconds <= 10 ? 'urgent' : ''}`} role="timer" aria-live="off">
                {snapshot.bonusChallengeStatus === 'success' ? '⏱️ 완료' : `⏱️ ${challengeRunning ? challengeSeconds : 0}초`}
              </span>
            </div>
            <div className="hud-row-bottom">
              <strong className="stage-score-value">{snapshot.stageScore.toLocaleString('ko-KR')}<small>점</small></strong>
              <div className="hud-target-progress">
                <span className="score-target-label"><span aria-hidden="true">⭐</span> {snapshot.stageScore.toLocaleString('ko-KR')} / {snapshot.scoreTarget.toLocaleString('ko-KR')}</span>
                <div className="score-target-track" role="progressbar" aria-label="별 3개 점수 목표 진행률"
                  aria-valuemin={0} aria-valuemax={100} aria-valuenow={targetProgress}>
                  <span style={{ width: `${targetProgress}%` }} />
                </div>
              </div>
              {(snapshot.state === 'FLYING' || (snapshot.skillCooldownRemainingMs ?? 0) > 0) && <span
                className={`skill-guide ${(snapshot.skillCooldownRemainingMs ?? 0) > 0 ? 'used' : ''}`}
                title={snapshot.form.skillDesc} role="status">
                {(snapshot.skillCooldownRemainingMs ?? 0) > 0
                  ? <><kbd>Space</kbd> 재사용까지 {Math.ceil((snapshot.skillCooldownRemainingMs ?? 0) / 1000)}초</>
                  : skillTargetNearby
                    ? <><kbd>Space</kbd> {snapshot.form.skillName} 사용 · 화면 탭</>
                    : <>고양이에게 가까이 가면 <kbd>Space</kbd> 사용 가능</>}
              </span>}
            </div>
          </div>
        </div>
        <div className="hud-card ammo-card" aria-label={`남은 병아리 ${snapshot.ammo}개`}>
          <span className="hud-kicker">탄환</span>
          <div className="ammo-dots" aria-hidden="true">
            {Array.from({ length: snapshot.stageAmmo }, (_, index) => (
              <span key={index} className={index < snapshot.ammo ? 'ammo-dot' : 'ammo-dot spent'}>
                {index < snapshot.ammo
                  ? <img src={assetUrl(`assets/chicks/stage-${snapshot.form.assetVariant}.png`)} alt="" />
                  : '·'}
              </span>
            ))}
          </div>
          {snapshot.ammo === 0 && <span className="ammo-empty">탄환을 모두 썼어요</span>}
        </div>
        {isBoss && <div className="boss-health-panel" aria-label="보스 체력">
          <div className="boss-health-heading"><strong>👑 {stage.bossRole === 'final' ? '최종 보스' : '중간 보스'}</strong><span>{Math.ceil(snapshot.bossHp ?? 0)} / {snapshot.bossMaxHp ?? 500}</span></div>
          <div className="boss-health-track" role="progressbar" aria-label="보스 남은 체력"
            aria-valuemin={0} aria-valuemax={snapshot.bossMaxHp ?? 500} aria-valuenow={snapshot.bossHp ?? 0}>
            <span style={{ width: `${Math.max(0, Math.min(100, ((snapshot.bossHp ?? 0) / (snapshot.bossMaxHp ?? 500)) * 100))}%` }} />
          </div>
          {(snapshot.bossHp ?? 0) > 0 && (snapshot.bossHp ?? 0) <= (snapshot.bossMaxHp ?? 500) / 2 &&
            <span className="boss-rage-label">폭주 중 · 충격파 주의</span>}
        </div>}
        <div id="top-bar-right" className="hud-actions">
          <button className={`icon-button ui-icon-button ${snapshot.muted ? 'ui-icon-muted' : 'ui-icon-sound'}`}
            onClick={onMute} disabled={!active} aria-label={snapshot.muted ? '소리 켜기' : '소리 끄기'} />
          <button className={`icon-button ui-icon-button ${snapshot.state === 'PAUSED' ? 'ui-icon-play' : 'ui-icon-pause'}`}
            onClick={onTogglePause} disabled={!active} aria-label={snapshot.state === 'PAUSED' ? '계속하기' : '일시정지'} />
          <button className="icon-button ui-icon-button ui-icon-restart" onClick={onRestart} disabled={!active} aria-label="현재 챕터 다시 시작"><kbd>R</kbd></button>
        </div>
      </div>
      <div id="item-bar" className="item-dock" aria-label={'\uC804\uB7B5 \uC544\uC774\uD15C'}>
        {items.map(({ kind, available, shortcut }) => {
          const item = ITEM_INFO[kind];
          const selected = kind === 'mega' ? snapshot.megaNext
            : kind === 'booster' ? snapshot.boosterNext
              : kind === 'quake' ? snapshot.quakeNext
                : snapshot.targetingItem === 'butter';
          return <button key={kind} className={selected ? 'item-button selected' : 'item-button'}
            title={item.description}
            aria-label={item.label + ', remaining ' + snapshot.items[kind] + ', key ' + shortcut}
            aria-pressed={selected}
            disabled={!active || !available || !snapshot.items[kind]}
            onClick={() => onUseItem(kind)}>
            <span aria-hidden="true"><ItemIcon kind={kind} /></span><span className="item-label">{item.label}</span>
            <kbd className="item-key-badge">[{shortcut}]</kbd><b>{snapshot.items[kind]}</b>
          </button>;
        })}
        <button className={snapshot.eggCushionActive ? 'cushion-chip selected' : 'cushion-chip'}
          onClick={() => onUseItem('cushion')} disabled={!active || !snapshot.items.cushion || snapshot.eggCushionActive}
          aria-label={ITEM_INFO.cushion.label + ', count ' + snapshot.items.cushion + (snapshot.eggCushionActive ? ', active' : '')}>
          <span aria-hidden="true"><ItemIcon kind="cushion" /></span><span>{ITEM_INFO.cushion.label}</span><b>{snapshot.items.cushion}</b>
        </button>
      </div>
    </div>
  );
}
