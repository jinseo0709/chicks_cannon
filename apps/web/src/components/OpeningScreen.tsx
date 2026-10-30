import { useState, type FormEvent, type JSX } from 'react';
import { assetUrl } from '../asset-url';
import { getSafeBrowserStorage, getSavedNickname, normalizeNickname, saveNickname } from '../leaderboard/identity';

export interface OpeningScreenProps {
  onContinue(): void;
  storage?: Storage;
}

export function OpeningScreen({ onContinue, storage = getSafeBrowserStorage() }: OpeningScreenProps): JSX.Element {
  const [nickname, setNickname] = useState(() => getSavedNickname(storage) ?? '');
  const normalizedNickname = normalizeNickname(nickname);

  const start = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizedNickname) return;
    saveNickname(storage, normalizedNickname);
    onContinue();
  };

  return (
    <section className="opening-screen" aria-labelledby="opening-title">
      <img
        className="opening-illustration"
        src={assetUrl('assets/story/opening-nest-stolen.png')}
        alt="고양이 무리가 병아리의 둥지를 빼앗아 달아나는 모습"
      />
      <div className="opening-vignette" aria-hidden="true" />
      <form className="opening-copy" onSubmit={start}>
        <p className="eyebrow">CHICKS CANNON · PROLOGUE</p>
        <h1 id="opening-title">우리 둥지를 빼앗겼다!</h1>
        <p>용감한 병아리의 둥지 탈환 모험이 지금 시작됩니다.</p>
        <label className="opening-nickname-label" htmlFor="opening-nickname">랭킹에 표시할 닉네임</label>
        <input
          id="opening-nickname"
          className="opening-nickname-input"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          maxLength={32}
          autoComplete="nickname"
          aria-describedby="opening-nickname-help"
        />
        <p id="opening-nickname-help" className="opening-nickname-help">
          2~16자 · 기록은 이 브라우저에 저장됩니다.
        </p>
        <button className="button button-primary" type="submit" disabled={!normalizedNickname}>
          이야기 시작
        </button>
      </form>
    </section>
  );
}
