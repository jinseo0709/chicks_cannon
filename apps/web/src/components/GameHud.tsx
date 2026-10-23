import type { JSX } from 'react';
import { assetUrl } from '../asset-url';
import type { GameSnapshot, ItemKind } from '../game/types';
import { STAGES } from '../game/stages';
import { ITEM_INFO } from '../game/items';

export interface GameHudProps {
  snapshot: GameSnapshot;
  onRestart(): void;
  onMute(): void;
  onUseItem(kind: ItemKind): void;
  onTogglePause(): void;
  onLaunchAim?(): void;
  onCancelAim?(): void;
}

const activeStates = new Set(['AIMING', 'FLYING', 'RESOLVING']);

export function GameHud({ snapshot, onRestart, onMute, onUseItem, onTogglePause, onLaunchAim = () => undefined, onCancelAim = () => undefined }: GameHudProps): JSX.Element {
  const stage = STAGES[snapshot.stage];
  const active = activeStates.has(snapshot.state);
  const targetProgress = snapshot.scoreTarget > 0
    ? Math.max(0, Math.min(100, Math.floor((snapshot.stageScore / snapshot.scoreTarget) * 100)))
    : 0;
  const items: { kind: ItemKind; available: boolean }[] = [
    { kind: 'mega', available: snapshot.state === 'AIMING' },
    { kind: 'booster', available: snapshot.state === 'FLYING' },
    { kind: 'quake', available: active },
    { kind: 'butter', available: active },
    { kind: 'cushion', available: active },
  ];
  return (
    <div className="game-hud" role="region" aria-label="게임 정보" inert={!active} aria-hidden={!active}>
      <div id="top-bar" className="hud-topline">
        <div className="hud-card chapter-card">
          <span className="hud-kicker">CHAPTER {snapshot.stage}</span>
          <strong title={stage.title}>{stage.title}</strong>
        </div>
        <div className="hud-card score-card" aria-label="이번 스테이지 점수">
          <span className="hud-kicker">🐣 이번 판 점수</span>
          <strong className="stage-score-value">{snapshot.stageScore.toLocaleString('ko-KR')}<small>점</small></strong>
          <span className="score-target-label"><span aria-hidden="true">⭐</span> 별 3개 목표 {snapshot.stageScore.toLocaleString('ko-KR')} / {snapshot.scoreTarget.toLocaleString('ko-KR')}</span>
          <div className="score-target-track" role="progressbar" aria-label="별 3개 점수 목표 진행률"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={targetProgress}>
            <span style={{ width: `${targetProgress}%` }} />
          </div>
          <span className="campaign-score"><span aria-hidden="true">🏆</span> 모험 누적 {snapshot.score.toLocaleString('ko-KR')}점</span>
          {snapshot.bonusChallengeStatus !== 'ready' && <span className={`bonus-timer ${snapshot.bonusChallengeStatus}`} role="status">
            {snapshot.bonusChallengeStatus === 'expired' ? '시간 초과 · 도전 실패' : snapshot.bonusChallengeStatus === 'success' ? `도전 성공 · ${stage.bonusChallenge.badge}` : `⏱ ${Math.ceil(snapshot.bonusChallengeRemainingMs / 1000)}초 안에 클리어하면 +${stage.bonusChallenge.bonusScore}점`}
          </span>}
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
        <div id="item-bar" className="item-tray" aria-label="사용 아이템">
          {items.map(({ kind, available }) => {
            const item = ITEM_INFO[kind];
            const selected = kind === 'mega' ? snapshot.megaNext : kind === 'butter' ? snapshot.targetingItem === 'butter'
              : kind === 'cushion' && snapshot.eggCushionActive;
            return <button key={kind} className={`item-button${selected ? ' selected' : ''}`}
              title={item.description}
              aria-label={`${item.label}, 남은 ${snapshot.items[kind]}개${kind === 'cushion' && snapshot.eggCushionActive ? ', 알 보호 중' : ''}`}
              aria-pressed={kind === 'mega' || kind === 'butter' || kind === 'cushion' ? selected : undefined}
              disabled={!active || !available || !snapshot.items[kind]}
              onClick={() => onUseItem(kind)}>
              <span aria-hidden="true">{item.icon}</span><span className="item-label">{item.label}</span><b>{snapshot.items[kind]}</b>
            </button>;
          })}
        </div>
        <div className="hud-actions">
          {snapshot.state === 'AIMING' && snapshot.aimPosition && <>
            <button className="aim-action launch-action" onClick={onLaunchAim} aria-label="발사">발사</button>
            <button className="aim-action cancel-action" onClick={onCancelAim} aria-label="조준 취소">취소</button>
          </>}
          <button className={`icon-button ui-icon-button ${snapshot.muted ? 'ui-icon-muted' : 'ui-icon-sound'}`}
            onClick={onMute} disabled={!active} aria-label={snapshot.muted ? '소리 켜기' : '소리 끄기'} />
          <button className={`icon-button ui-icon-button ${snapshot.state === 'PAUSED' ? 'ui-icon-play' : 'ui-icon-pause'}`}
            onClick={onTogglePause} disabled={!active} aria-label={snapshot.state === 'PAUSED' ? '계속하기' : '일시정지'} />
          <button className="icon-button ui-icon-button ui-icon-restart" onClick={onRestart} disabled={!active} aria-label="현재 챕터 다시 시작" />
        </div>
      </div>
    </div>
  );
}
