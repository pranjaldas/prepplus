import 'server-only';
import { randomInt } from 'crypto';

// No 0/O/1/I, to avoid confusion when codes are read aloud or typed.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** e.g. PP-4K9Z (7 characters). */
export function generateExamCode(): string {
  let suffix = '';
  for (let i = 0; i < 4; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `PP-${suffix}`;
}

export function normaliseExamCode(code: string): string {
  return decodeURIComponent(code).trim().toUpperCase();
}
