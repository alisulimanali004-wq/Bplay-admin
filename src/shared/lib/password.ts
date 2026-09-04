/**
 * Suggest a strong password that always satisfies the shared `strongPassword`
 * rule (≥8 chars, an uppercase letter, a digit and a symbol). Uses the Web
 * Crypto RNG for unbiased picks. Ambiguous glyphs (O/0, I/l/1) are left out so
 * the issued password is easy to read and share.
 */
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGIT = '23456789';
const SYMBOL = '!@#$%^&*?-_';
const ALL = UPPER + LOWER + DIGIT + SYMBOL;

/** A uniform integer in [0, max) via rejection sampling over crypto bytes. */
function randomInt(max: number): number {
  const limit = Math.floor(256 / max) * max;
  const buffer = new Uint8Array(1);
  let byte = 0;
  do {
    crypto.getRandomValues(buffer);
    byte = buffer[0];
  } while (byte >= limit);
  return byte % max;
}

function pick(chars: string): string {
  return chars[randomInt(chars.length)];
}

export function generateStrongPassword(length = 16): string {
  const size = Math.max(length, 8);
  // Seed one of each required class, then fill and shuffle so their positions
  // aren't predictable.
  const chars = [pick(UPPER), pick(LOWER), pick(DIGIT), pick(SYMBOL)];
  while (chars.length < size) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
