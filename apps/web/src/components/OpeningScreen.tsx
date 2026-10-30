import { useEffect, useState, type JSX } from 'react';
import { assetUrl } from '../asset-url';
import { leaderboardAuth, type LeaderboardAuth } from '../leaderboard/auth';

export interface OpeningScreenProps {
  auth?: LeaderboardAuth;
  onContinue(): void;
}

export function OpeningScreen({ auth = leaderboardAuth, onContinue }: OpeningScreenProps): JSX.Element {
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void auth.hasAccount().then((hasAccount) => {
      if (active) setSignedIn(hasAccount);
    }).catch(() => {
      if (active) setSignedIn(false);
    });
    return () => { active = false; };
  }, [auth]);

  const enterGame = async () => {
    if (!auth.isConfigured || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!signedIn) await auth.signIn();
      await auth.getAccessToken();
      setSignedIn(true);
      onContinue();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Microsoft 회사 계정 로그인에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const configurationReady = auth.isConfigured;
  return (
    <section className="opening-screen" aria-labelledby="opening-title">
      <img
        className="opening-illustration"
        src={assetUrl('assets/story/opening-nest-stolen.png')}
        alt="고양이 무리가 병아리의 둥지를 빼앗아 달아나는 모습"
      />
      <div className="opening-vignette" aria-hidden="true" />
      <div className="opening-copy">
        <p className="eyebrow">CHICKS CANNON · PROLOGUE</p>
        <h1 id="opening-title">우리 둥지를 빼앗겼다!</h1>
        <p>용감한 병아리의 둥지 탈환 모험이 지금 시작됩니다.</p>
        <button className="button button-primary" onClick={() => void enterGame()} disabled={!configurationReady || busy}>
          {!configurationReady
            ? '회사 계정 로그인 설정이 필요합니다'
            : busy
              ? '로그인 확인 중…'
              : signedIn
                ? '이야기 시작'
                : 'Microsoft 계정으로 로그인하고 시작'}
        </button>
        {!configurationReady && <p role="status">Entra 앱 등록값을 설정하면 회사 계정 로그인이 열립니다.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </section>
  );
}
