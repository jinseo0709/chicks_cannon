import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PausePanel } from './PausePanel';

describe('PausePanel', () => {
  it('exposes accessible resume and current-stage restart actions', () => {
    const onResume = vi.fn();
    const onRestart = vi.fn();
    render(<PausePanel onResume={onResume} onRestart={onRestart} />);
    expect(screen.getByRole('dialog', { name: '게임 일시정지' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '계속하기' }));
    fireEvent.click(screen.getByRole('button', { name: '현재 챕터 다시 시작' }));
    expect(onResume).toHaveBeenCalledOnce();
    expect(onRestart).toHaveBeenCalledOnce();
  });
});
