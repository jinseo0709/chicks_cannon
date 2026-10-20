import { useEffect, useRef, useState, type FormEvent, type JSX } from 'react';
import { normalizeNickname } from '../leaderboard/identity';

export interface NicknameDialogProps {
  initialNickname: string | null;
  busy: boolean;
  error: string | null;
  onSubmit(nickname: string): void;
  onCancel(): void;
}

export function NicknameDialog({ initialNickname, busy, error, onSubmit, onCancel }: NicknameDialogProps): JSX.Element {
  const [value, setValue] = useState(initialNickname ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const nickname = normalizeNickname(value);

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onCancel]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!busy && nickname) onSubmit(nickname);
  };

  return (
    <div className="overlay-backdrop nickname-backdrop">
      <form className="modal-card nickname-dialog" role="dialog" aria-modal="true" aria-labelledby="nickname-title" onSubmit={submit}>
        <p className="eyebrow">YOUR ADVENTURER NAME</p>
        <h2 id="nickname-title">어떤 이름으로 기록할까요?</h2>
        <label htmlFor="nickname-input">닉네임 <span>(2~16자)</span></label>
        <input
          ref={inputRef}
          id="nickname-input"
          autoComplete="nickname"
          maxLength={32}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-describedby={error ? 'nickname-error' : 'nickname-help'}
          aria-invalid={Boolean(value.trim()) && !nickname}
          disabled={busy}
        />
        <p id="nickname-help" className="nickname-help">한글, 영문, 숫자, 공백, 밑줄, 하이픈을 사용할 수 있어요.</p>
        {error && <p id="nickname-error" className="form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="button button-secondary" onClick={onCancel} disabled={busy}>취소</button>
          <button type="submit" className="button button-primary" disabled={!nickname || busy}>
            {busy ? '등록 중…' : '점수 등록'}
          </button>
        </div>
      </form>
    </div>
  );
}
