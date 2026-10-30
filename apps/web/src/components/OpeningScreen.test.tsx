import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OpeningScreen } from './OpeningScreen';

function makeStorage() {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  } as Storage;
}

describe('OpeningScreen', () => {
  it('requires a valid local nickname, saves it, and continues', () => {
    const storage = makeStorage();
    const onContinue = vi.fn();
    render(<OpeningScreen storage={storage} onContinue={onContinue} />);
    const button = screen.getByRole('button', { name: '이야기 시작' });
    expect(button.hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByLabelText('랭킹에 표시할 닉네임'), { target: { value: '새싹' } });
    expect(button.hasAttribute('disabled')).toBe(false);
    fireEvent.click(button);
    expect(storage.getItem('chicks-cannon:nickname:v1')).toBe('새싹');
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('loads the saved nickname for editing on the next visit', () => {
    const storage = makeStorage();
    storage.setItem('chicks-cannon:nickname:v1', '새싹');
    render(<OpeningScreen storage={storage} onContinue={vi.fn()} />);
    expect((screen.getByLabelText('랭킹에 표시할 닉네임') as HTMLInputElement).value).toBe('새싹');
  });
});
