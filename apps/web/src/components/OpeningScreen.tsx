import type { JSX } from 'react';

export interface OpeningScreenProps {
  onContinue(): void;
}

export function OpeningScreen({ onContinue }: OpeningScreenProps): JSX.Element {
  return (
    <section className="opening-screen" aria-labelledby="opening-title">
      <img
        className="opening-illustration"
        src="/assets/story/opening-nest-stolen.png"
        alt="고양이 무리가 병아리의 둥지를 빼앗아 달아나는 모습"
      />
      <div className="opening-vignette" aria-hidden="true" />
      <div className="opening-copy">
        <p className="eyebrow">CHICKS CANNON · PROLOGUE</p>
        <h1 id="opening-title">우리 둥지를 빼앗겼다!</h1>
        <p>용감한 병아리의 둥지 탈환 모험이 지금 시작됩니다.</p>
        <button className="button button-primary" onClick={onContinue}>이야기 시작</button>
      </div>
    </section>
  );
}
