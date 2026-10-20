const participantKey = 'chicks-cannon:participant-id:v1';
const nicknameKey = 'chicks-cannon:nickname:v1';
const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const nicknamePattern = /^[\p{L}\p{N}_ -]+$/u;
let volatileParticipantId: string | null = null;
let volatileNickname: string | null = null;

class VolatileStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, String(value)); }
}

const volatileStorage = new VolatileStorage();

export function getSafeBrowserStorage(): Storage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    // Private browsing policies may throw while reading localStorage itself.
  }
  return volatileStorage;
}

export function normalizeNickname(value: string): string | null {
  const nickname = value.trim();
  const length = [...nickname].length;
  return length >= 2 && length <= 16 && nicknamePattern.test(nickname) ? nickname : null;
}

export function getOrCreateParticipant(storage: Storage): string {
  try {
    const saved = storage.getItem(participantKey);
    if (saved && uuidV4Pattern.test(saved)) {
      volatileParticipantId = saved.toLowerCase();
      return volatileParticipantId;
    }
    const participantId = createUuidV4();
    storage.setItem(participantKey, participantId);
    volatileParticipantId = participantId;
    return participantId;
  } catch {
    volatileParticipantId ??= createUuidV4();
    return volatileParticipantId;
  }
}

export function getSavedNickname(storage: Storage): string | null {
  try {
    const nickname = storage.getItem(nicknameKey);
    const normalized = nickname ? normalizeNickname(nickname) : null;
    if (normalized) volatileNickname = normalized;
    return normalized ?? volatileNickname;
  } catch {
    return volatileNickname;
  }
}

export function saveNickname(storage: Storage, nickname: string): void {
  const normalized = normalizeNickname(nickname);
  if (!normalized) throw new RangeError('닉네임은 2~16자의 한글·영문·숫자·공백·_·-만 사용할 수 있습니다.');
  volatileNickname = normalized;
  try {
    storage.setItem(nicknameKey, normalized);
  } catch {
    // Keep this session's nickname in memory if persistent storage is unavailable.
  }
}

function createUuidV4(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    // Fall through to a UUID-shaped session-only identifier.
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}
