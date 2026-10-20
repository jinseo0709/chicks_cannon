import type { JSX } from 'react';
import type { ChickCannonController } from '../game/use-chick-cannon';

export function GameCanvas({ controller }: { controller: ChickCannonController }): JSX.Element {
  return (
    <div className="canvas-layer">
      <canvas
        ref={controller.attachCanvas}
        className="game-canvas"
        aria-label="병아리 대포 게임 장면. 새총 주변을 끌어 조준하고 손을 놓아 발사하세요."
      />
      {!controller.assetsReady && (
        <div className="canvas-loading" role="status">모험 장면을 준비하고 있어요…</div>
      )}
    </div>
  );
}
