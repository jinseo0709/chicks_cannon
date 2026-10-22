import type { JSX } from 'react';
import type { ChickCannonController } from '../game/use-chick-cannon';

export function GameCanvas({ controller }: { controller: ChickCannonController }): JSX.Element {
  return (
    <div className="canvas-layer">
      <canvas
        ref={controller.attachCanvas}
        className={`game-canvas${controller.snapshot.targetingItem ? ' targeting' : ''}`}
        aria-label={controller.snapshot.targetingItem
          ? '버터 스프레이 대상 선택. 미끄럽게 할 블록이나 바닥을 탭하세요.'
          : '병아리 대포 게임 장면. 새총 주변을 끌어 조준하고 손을 놓아 발사하세요.'}
      />
      {controller.snapshot.targetingItem && (
        <div className="targeting-hint" role="status">미끄럽게 할 블록이나 바닥을 탭하세요. 다시 누르거나 Esc로 취소합니다.</div>
      )}
      {!controller.assetsReady && (
        <div className="canvas-loading" role="status">모험 장면을 준비하고 있어요…</div>
      )}
    </div>
  );
}
