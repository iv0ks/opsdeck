// The signed session is the one piece of identity the server gets right. These
// tests pin that, so the lab's flaw stays where it belongs: in the admin routes
// that never check the role, not in the session itself.
import { describe, expect, it } from 'vitest';
import { createSessionToken, verifySessionToken } from '../src/lib/session';
import { hashPassword, verifyPassword } from '../src/lib/password';

describe('session token', () => {
  it('round-trips the user id', () => {
    const token = createSessionToken(1);
    expect(verifySessionToken(token)?.userId).toBe(1);
  });

  it('rejects a token whose payload was edited (e.g. alice -> bob)', () => {
    const [, signature] = createSessionToken(1).split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ userId: 2, exp: 9999999999 })).toString(
      'base64url',
    );
    expect(verifySessionToken(`${forgedPayload}.${signature}`)).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = createSessionToken(1, Date.now() - 1000 * 60 * 60 * 24);
    expect(verifySessionToken(token)).toBeNull();
  });

  it('rejects missing or malformed tokens', () => {
    expect(verifySessionToken(undefined)).toBeNull();
    expect(verifySessionToken('')).toBeNull();
    expect(verifySessionToken('garbage')).toBeNull();
    expect(verifySessionToken('a.b')).toBeNull();
  });

  it('does not carry a role (the role lives in the database, not the token)', () => {
    const payload = createSessionToken(1).split('.')[0]!;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    expect(Object.keys(decoded).sort()).toEqual(['exp', 'userId']);
  });
});

describe('password hashing', () => {
  it('verifies the right password and rejects the wrong one', () => {
    const stored = hashPassword('password123');
    expect(verifyPassword('password123', stored)).toBe(true);
    expect(verifyPassword('nope', stored)).toBe(false);
  });
});
