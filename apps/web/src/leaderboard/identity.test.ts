import { describe, expect, it } from 'vitest';
import { getOrCreateParticipant, getSavedNickname, saveNickname } from './identity';

describe('browser participant identity', () => {
  it('creates and reuses a versioned UUID and saved nickname', () => {
    const storage = window.localStorage;
    storage.clear();
    const firstId = getOrCreateParticipant(storage);
    expect(firstId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(getOrCreateParticipant(storage)).toBe(firstId);
    saveNickname(storage, '  새싹  ');
    expect(getSavedNickname(storage)).toBe('새싹');
    storage.clear();
  });

  it('replaces corrupt participant IDs and uses session memory when storage throws', () => {
    const corrupt = {
      getItem: () => 'not-a-uuid', setItem: () => undefined, removeItem: () => undefined,
      clear: () => undefined, key: () => null, length: 0,
    } as Storage;
    expect(getOrCreateParticipant(corrupt)).not.toBe('not-a-uuid');
    const unavailable = {
      getItem: () => { throw new Error('storage disabled'); },
      setItem: () => { throw new Error('storage disabled'); },
      removeItem: () => undefined, clear: () => undefined, key: () => null, length: 0,
    } as Storage;
    expect(getOrCreateParticipant(unavailable)).toMatch(/-4[0-9a-f]{3}-/i);
    saveNickname(unavailable, '오래달리기');
    expect(getSavedNickname(unavailable)).toBe('오래달리기');
  });
});
