import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DialoguePanel } from './DialoguePanel';
import { STAGES } from '../game/stages';

describe('DialoguePanel', () => {
  it('shows the chapter story and advances when the player continues', () => {
    const onContinue = vi.fn();
    render(<DialoguePanel stage={2} story={STAGES[2].story} onContinue={onContinue} />);
    expect(screen.getByRole('heading', { name: STAGES[2].story.speaker })).toBeTruthy();
    expect(screen.getByText(STAGES[2].story.chickReply)).toBeTruthy();
    STAGES[2].attackRoutes.forEach((route, index) => {
      expect(screen.getByText(`${index + 1}. ${route.name}`)).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: '도전 시작' }));
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
