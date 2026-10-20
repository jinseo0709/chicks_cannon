import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DialoguePanel } from './DialoguePanel';
import { STAGES } from '../game/stages';

describe('DialoguePanel', () => {
  it('shows the chapter story and advances when the player continues', () => {
    const onContinue = vi.fn();
    render(<DialoguePanel story={STAGES[2].story} onContinue={onContinue} />);
    expect(screen.getByRole('heading', { name: STAGES[2].story.speaker })).toBeTruthy();
    expect(screen.getByText(STAGES[2].story.chickReply)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '도전 시작' }));
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
