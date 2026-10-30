import { createHash } from 'node:crypto';
import type { HttpRequest } from '@azure/functions';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { ApiError } from './types';

const jwksByTenant = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function requiredSetting(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new ApiError(503, 'AUTHENTICATION_NOT_CONFIGURED', '순위 등록 로그인 설정이 완료되지 않았습니다.');
  return value;
}

function toOpaqueParticipantId(tenantId: string, objectId: string): string {
  const bytes = createHash('sha256').update(`${tenantId.toLowerCase()}:${objectId.toLowerCase()}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function authenticateEntraRequest(request: HttpRequest): Promise<string> {
  const header = request.headers.get('authorization');
  const match = header?.match(/^Bearer\s+([A-Za-z0-9._~-]+)$/i);
  if (!match) throw new ApiError(401, 'AUTHENTICATION_REQUIRED', '회사 Microsoft 계정으로 로그인해 주세요.');

  const tenantId = requiredSetting('ENTRA_TENANT_ID');
  const audience = requiredSetting('ENTRA_API_AUDIENCE');
  const spaClientId = requiredSetting('ENTRA_SPA_CLIENT_ID');
  let jwks = jwksByTenant.get(tenantId.toLowerCase());
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/discovery/v2.0/keys`));
    jwksByTenant.set(tenantId.toLowerCase(), jwks);
  }
  let payload;
  try {
    ({ payload } = await jwtVerify(match[1], jwks, {
      algorithms: ['RS256'],
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      audience,
    }));
  } catch {
    throw new ApiError(401, 'INVALID_ACCESS_TOKEN', '로그인 정보가 만료되었거나 유효하지 않습니다. 다시 로그인해 주세요.');
  }
  const grantedScopes = typeof payload.scp === 'string' ? payload.scp.split(/\s+/) : [];
  if (payload.ver !== '2.0'
    || typeof payload.tid !== 'string' || payload.tid.toLowerCase() !== tenantId.toLowerCase()
    || typeof payload.oid !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.oid)
    || typeof payload.azp !== 'string' || payload.azp.toLowerCase() !== spaClientId.toLowerCase()
    || !grantedScopes.includes('access_as_user')) {
    throw new ApiError(401, 'INVALID_ACCESS_TOKEN', '회사 계정의 사용자 정보를 확인할 수 없습니다.');
  }
  return toOpaqueParticipantId(payload.tid, payload.oid);
}
