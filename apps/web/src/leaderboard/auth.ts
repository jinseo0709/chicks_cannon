import type { AuthenticationResult, PublicClientApplication } from '@azure/msal-browser';

export interface LeaderboardAuth {
  readonly isConfigured: boolean;
  hasAccount(): Promise<boolean>;
  signIn(): Promise<void>;
  getAccessToken(): Promise<string>;
}

const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID?.trim() ?? '';
const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID?.trim() ?? '';
const apiScope = import.meta.env.VITE_ENTRA_API_SCOPE?.trim() ?? '';

class MicrosoftLeaderboardAuth implements LeaderboardAuth {
  readonly isConfigured = Boolean(tenantId && clientId && apiScope);
  private applicationPromise: Promise<PublicClientApplication> | null = null;

  private async application(): Promise<PublicClientApplication> {
    if (!this.isConfigured) throw new Error('Microsoft 회사 계정 로그인이 아직 설정되지 않았습니다.');
    if (!this.applicationPromise) {
      this.applicationPromise = import('@azure/msal-browser').then(async ({ PublicClientApplication }) => {
        const application = new PublicClientApplication({
          auth: {
            clientId,
            authority: `https://login.microsoftonline.com/${tenantId}`,
            redirectUri: window.location.origin,
          },
          cache: { cacheLocation: 'sessionStorage' },
        });
        await application.initialize();
        return application;
      });
    }
    return this.applicationPromise;
  }

  async hasAccount(): Promise<boolean> {
    return (await (await this.application()).getAllAccounts()).length > 0;
  }

  async signIn(): Promise<void> {
    const app = await this.application();
    const existing = app.getAllAccounts()[0];
    if (existing) {
      app.setActiveAccount(existing);
      return;
    }
    const result = await app.loginPopup({ scopes: [apiScope], prompt: 'select_account' });
    app.setActiveAccount(result.account);
  }

  async getAccessToken(): Promise<string> {
    const app = await this.application();
    const account = app.getActiveAccount() ?? app.getAllAccounts()[0];
    if (!account) throw new Error('회사 Microsoft 계정으로 먼저 로그인해 주세요.');
    app.setActiveAccount(account);
    try {
      return (await app.acquireTokenSilent({ scopes: [apiScope], account })).accessToken;
    } catch (error) {
      if (!(error instanceof Error) || error.name !== 'InteractionRequiredAuthError') throw error;
      const result: AuthenticationResult = await app.acquireTokenPopup({ scopes: [apiScope], account });
      return result.accessToken;
    }
  }
}

export const leaderboardAuth: LeaderboardAuth = new MicrosoftLeaderboardAuth();

declare global {
  interface ImportMetaEnv {
    readonly VITE_ENTRA_TENANT_ID?: string;
    readonly VITE_ENTRA_CLIENT_ID?: string;
    readonly VITE_ENTRA_API_SCOPE?: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
