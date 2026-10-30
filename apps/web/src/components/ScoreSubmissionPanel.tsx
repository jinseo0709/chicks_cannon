import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import type { LeaderboardRepository, ScoreSubmission } from '../leaderboard/types';
import { getOrCreateParticipant, getSavedNickname, saveNickname } from '../leaderboard/identity';

const DEFAULT_NICKNAME = '병아리 모험가';

export interface ScoreSubmissionPanelProps {
  score: number;
  completed: boolean;
  client: LeaderboardRepository;
  storage: Storage;
}

export function ScoreSubmissionPanel({ score, completed, client, storage }: ScoreSubmissionPanelProps): JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScoreSubmission | null>(null);
  const pending = useRef(false);
  const nickname = getSavedNickname(storage) ?? DEFAULT_NICKNAME;

  const submit = useCallback(async () => {
    if (!completed || pending.current || result) return;
    pending.current = true;
    setError(null);
    try {
      const entry = await client.submit({
        participantId: getOrCreateParticipant(storage),
        nickname,
        score,
        campaignCompleted: true,
      });
      saveNickname(storage, nickname);
      setResult(entry);
    } catch (reason) {
      setError(reason instanceof Error
        ? reason.message
        : '네트워크 오류로 점수를 등록하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      pending.current = false;
    }
  }, [client, completed, nickname, result, score, storage]);

  useEffect(() => {
    if (completed && !result && !error) void submit();
  }, [completed, error, result, submit]);
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
  return <p className="score-submission" role="status">내 브라우저 순위표에 점수를 자동 등록하고 있어요…</p>;
}
