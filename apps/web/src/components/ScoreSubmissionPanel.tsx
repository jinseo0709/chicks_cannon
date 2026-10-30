import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import { LeaderboardApiError, type ScoreSubmission } from '../leaderboard/types';
import { getSavedNickname, saveNickname } from '../leaderboard/identity';
import type { LeaderboardClient } from '../leaderboard/client';
import { leaderboardAuth, type LeaderboardAuth } from '../leaderboard/auth';

const DEFAULT_NICKNAME = '병아리 모험가';

export interface ScoreSubmissionPanelProps {
  score: number;
  completed: boolean;
  client: LeaderboardClient;
  storage: Storage;
  auth?: LeaderboardAuth;
}

export function ScoreSubmissionPanel({ score, completed, client, storage, auth = leaderboardAuth }: ScoreSubmissionPanelProps): JSX.Element {
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScoreSubmission | null>(null);
  const pending = useRef(false);
  const nickname = getSavedNickname(storage) ?? DEFAULT_NICKNAME;

  useEffect(() => {
    let active = true;
    void auth.hasAccount().then((hasAccount) => {
      if (active) setSignedIn(hasAccount);
    }).catch(() => {
      if (active) setSignedIn(false);
    });
    return () => { active = false; };
  }, [auth]);

  const submit = useCallback(async () => {
    if (!completed || pending.current || result) return;
    pending.current = true;
    setError(null);
    try {
      const accessToken = await auth.getAccessToken();
      const entry = await client.submit({ nickname, score, campaignCompleted: true }, accessToken);
      saveNickname(storage, nickname);
      setResult(entry);
    } catch (reason) {
      setError(reason instanceof LeaderboardApiError || reason instanceof Error
        ? reason.message
        : '네트워크 오류로 점수를 등록하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      pending.current = false;
    }
  }, [auth, client, completed, nickname, result, score, storage]);

  useEffect(() => {
    if (signedIn && completed && !result && !error) void submit();
  }, [completed, error, result, signedIn, submit]);

  if (!auth.isConfigured) {
    return <p className="score-submission" role="status">회사 계정 로그인을 설정하면 순위가 자동 등록됩니다.</p>;
  }
  if (result) {
    return <p className="score-submission submission-success" role="status">
      {result.bestScore > score
        ? `${result.nickname}님의 최고 기록 ${result.bestScore.toLocaleString('ko-KR')}점을 유지했어요!`
        : `${result.nickname}님의 ${result.bestScore.toLocaleString('ko-KR')}점 기록을 순위표에 등록했어요!`}
    </p>;
  }
  if (error) {
    return (
      <div className="score-submission" aria-live="polite">
        <p className="form-error" role="alert">자동 순위 등록에 실패했습니다: {error}</p>
        <button className="text-button" onClick={() => void submit()}>다시 시도</button>
      </div>
    );
  }
  return <p className="score-submission" role="status">
    {signedIn ? '순위표에 점수를 자동 등록하고 있어요…' : 'Microsoft 계정 로그인을 확인하고 있어요…'}
  </p>;
}
