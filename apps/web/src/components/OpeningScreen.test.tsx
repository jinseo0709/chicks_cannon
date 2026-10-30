import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OpeningScreen } from './OpeningScreen';
import type { LeaderboardAuth } from '../leaderboard/auth';

describe('OpeningScreen', () => {
  it('requires Microsoft sign-in and an API token before entering the game', async () => {
    let signedIn = false;
    const auth: LeaderboardAuth = {
      isConfigured: true,
      hasAccount: async () => signedIn,
      signIn: async () => { signedIn = true; },
      getAccessToken: vi.fn(async () => 'token'),
    };
    const onContinue = vi.fn();
    render(<OpeningScreen auth={auth} onContinue={onContinue} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Microsoft 계정으로 로그인하고 시작' }));
    await waitFor(() => expect(onContinue).toHaveBeenCalledOnce());
    expect(auth.getAccessToken).toHaveBeenCalledOnce();
  });

  it('keeps the sign-in gate closed while Entra app settings are missing', () => {
    const onContinue = vi.fn();
    const auth: LeaderboardAuth = {
      isConfigured: false,
      hasAccount: async () => false,
      signIn: vi.fn(),
      getAccessToken: vi.fn(),
    };
    render(<OpeningScreen auth={auth} onContinue={onContinue} />);
    expect(screen.getByRole('button', { name: '회사 계정 로그인 설정이 필요합니다' }).hasAttribute('disabled')).toBe(true);
    expect(onContinue).not.toHaveBeenCalled();
  });
});
