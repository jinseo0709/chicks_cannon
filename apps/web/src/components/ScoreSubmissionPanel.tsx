import { useEffect, useRef, useState, type JSX } from 'react';
import { LeaderboardApiError, type ScoreSubmission } from '../leaderboard/types';
import { getSavedNickname, saveNickname } from '../leaderboard/identity';
import type { LeaderboardClient } from '../leaderboard/client';
import { leaderboardAuth, type LeaderboardAuth } from '../leaderboard/auth';
import { NicknameDialog } from './NicknameDialog';

export interface ScoreSubmissionPanelProps {
  score: number;
  completed: boolean;
  client: LeaderboardClient;
  storage: Storage;
  auth?: LeaderboardAuth;
}

export function ScoreSubmissionPanel({ score, completed, client, storage, auth = leaderboardAuth }: ScoreSubmissionPanelProps): JSX.Element {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScoreSubmission | null>(null);
  const pending = useRef(false);
  const savedNickname = getSavedNickname(storage);

  useEffect(() => {
    let active = true;
    void auth.hasAccount().then((hasAccount) => {
      if (active) setSignedIn(hasAccount);
    }).catch(() => {
      if (active) setSignedIn(false);
    });
    return () => { active = false; };
  }, [auth]);

  const submit = async (nickname: string) => {
    if (!completed || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const accessToken = await auth.getAccessToken();
      const entry = await client.submit({ nickname, score, campaignCompleted: true }, accessToken);
      saveNickname(storage, nickname);
      setResult(entry);
      setDialogOpen(false);
    } catch (reason) {
      setError(reason instanceof LeaderboardApiError || reason instanceof Error
        ? reason.message
        : '네트워크 오류로 점수를 등록하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const beginSubmit = () => {
    if (!completed || busy) return;
    if (!signedIn) {
      setBusy(true);
      setError(null);
      void auth.signIn().then(async () => {
        setSignedIn(true);
        if (savedNickname) {
          await submit(savedNickname);
        } else {
          setDialogOpen(true);
          setBusy(false);
        }
      }).catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Microsoft 회사 계정 로그인에 실패했습니다.');
        setBusy(false);
      });
      return;
    }
    if (savedNickname) void submit(savedNickname);
    else setDialogOpen(true);
  };

  return (
    <div className="score-submission" aria-live="polite">
      {result ? (
        <p className="submission-success" role="status">
          {result.bestScore > score
            ? `${result.nickname}님의 최고 기록 ${result.bestScore.toLocaleString('ko-KR')}점을 유지했어요!`
            : `${result.nickname}님의 ${result.bestScore.toLocaleString('ko-KR')}점 기록을 등록했어요!`}
        </p>
      ) : (
        <button className="button button-submit-score" onClick={beginSubmit} disabled={!completed || busy || !auth.isConfigured}>
          {busy ? '로그인·점수 등록 중…' : !auth.isConfigured ? '회사 계정 로그인 설정이 필요합니다' : signedIn ? '순위 등록' : 'Microsoft 계정으로 로그인'}
        </button>
      )}
      {error && !dialogOpen && <p className="form-error" role="alert">{error}</p>}
      {error && !dialogOpen && <button className="text-button" onClick={beginSubmit} disabled={busy}>다시 시도</button>}
      {dialogOpen && (
        <NicknameDialog
          initialNickname={savedNickname}
          busy={busy}
          error={error}
          onSubmit={(nickname) => void submit(nickname)}
          onCancel={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
