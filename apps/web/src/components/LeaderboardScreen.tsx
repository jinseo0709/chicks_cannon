import { useEffect, useState, type JSX } from 'react';
import type { LeaderboardPage, LeaderboardRepository } from '../leaderboard/types';

export interface LeaderboardScreenProps {
  client: LeaderboardRepository;
  onBack(): void;
  pageSize?: number;
}

export function LeaderboardScreen({ client, onBack, pageSize = 25 }: LeaderboardScreenProps): JSX.Element {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LeaderboardPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);
    void client.list(page, pageSize, abort.signal).then((result) => {
      if (!active) return;
      setData(result);
      setLoading(false);
    }).catch((reason: unknown) => {
      if (!active || (reason instanceof DOMException && reason.name === 'AbortError')) return;
      setError(reason instanceof Error ? reason.message : '순위표를 불러오지 못했습니다.');
      setLoading(false);
    });
    return () => {
      active = false;
      abort.abort();
    };
  }, [client, page, pageSize, reloadKey]);

  return (
    <section className="leaderboard-screen" aria-labelledby="leaderboard-title">
      <header className="leaderboard-header">
        <button className="button button-secondary leaderboard-back" onClick={onBack}>← 돌아가기</button>
        <div>
          <p className="eyebrow">LOCAL · BEST SCORES</p>
          <h1 id="leaderboard-title">모험가 순위표</h1>
          <p className="leaderboard-local-note">이 브라우저에 저장된 기록이에요.</p>
        </div>
      </header>

      {loading && <div className="leaderboard-status" role="status">순위표를 불러오는 중…</div>}
      {!loading && error && (
        <div className="leaderboard-error" role="alert">
          <p>{error}</p>
          <button className="button button-primary" onClick={() => setReloadKey((value) => value + 1)}>다시 불러오기</button>
        </div>
      )}
      {!loading && !error && data?.items.length === 0 && (
        <div className="leaderboard-empty" role="status">
          <span aria-hidden="true">🐣</span>
          <h2>아직 등록된 기록이 없어요</h2>
          <p>모험을 마치고 첫 점수를 남겨 보세요.</p>
        </div>
      )}
      {!loading && !error && data && data.items.length > 0 && (
        <>
          <div className="leaderboard-table-wrap" role="region" aria-label="전체 순위 목록" tabIndex={0}>
            <table className="leaderboard-table">
              <thead>
                <tr><th scope="col">순위</th><th scope="col">모험가</th><th scope="col">최고 점수</th><th scope="col">달성 날짜</th></tr>
              </thead>
              <tbody>
                {data.items.map((entry) => (
                  <tr key={entry.participantId}>
                    <td><span className={entry.rank <= 3 ? 'rank-medal' : 'rank-number'}>{entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}</span></td>
                    <th scope="row">{entry.nickname}</th>
                    <td className="leaderboard-score">{entry.bestScore.toLocaleString('ko-KR')}</td>
                    <td>{formatAchievedDate(entry.achievedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="leaderboard-pagination" aria-label="순위 페이지">
            <button className="button button-secondary" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>
              이전
            </button>
            <span aria-live="polite">{data.totalPages === 0 ? 0 : page} / {data.totalPages} 페이지 · 전체 {data.totalCount}명</span>
            <button className="button button-secondary" onClick={() => setPage((value) => Math.min(data.totalPages, value + 1))} disabled={page >= data.totalPages}>
              다음
            </button>
          </nav>
        </>
      )}
    </section>
  );
}

function formatAchievedDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '날짜 정보 없음' : new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(date);
}
