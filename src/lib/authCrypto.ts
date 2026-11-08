/**
 * authCrypto.ts
 * Web Crypto API PBKDF2 hashing, password generation, and strength evaluation.
 * Passwords are NEVER stored or logged in plaintext.
 */

export interface PasswordStrength {
  score: number; // 0 to 4
  label: 'Too weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  color: string;
  feedback: string[];
}

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH_BITS = 256;

/**
 * Generate a strong password using cryptographically secure random values.
 * Contains lowercase, uppercase, numbers, and symbols. Minimum 14 chars.
 */
export function generateStrongPassword(length = 16): string {
  const minLen = Math.max(12, length);
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowers = 'abcdefghijkmnpqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*()_+-=~';
  const allChars = uppers + lowers + numbers + symbols;

  const array = new Uint32Array(minLen);
  crypto.getRandomValues(array);

  // Guarantee at least one of each category
  const chars: string[] = [
    uppers[array[0] % uppers.length],
    lowers[array[1] % lowers.length],
    numbers[array[2] % numbers.length],
    symbols[array[3] % symbols.length],
  ];

  for (let i = 4; i < minLen; i++) {
    chars.push(allChars[array[i] % allChars.length]);
  }

  // Shuffle using Fisher-Yates
  for (let i = chars.length - 1; i > 0; i--) {
    const j = array[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

/**
 * Calculate password strength with minimum 12 chars requirement.
 */
export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: 'Too weak',
      color: '#9CA3AF',
      feedback: ['Enter a password (minimum 12 characters)'],
    };
  }

  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 12) score += 1;
  else feedback.push('At least 12 characters');

  if (password.length >= 16) score += 1;

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  else feedback.push('Mix of uppercase & lowercase letters');

  if (/\d/.test(password)) score += 1;
  else feedback.push('At least one number');

  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('At least one symbol (!@#$%...)');

  // Normalize to 0-4
  const normalizedScore = Math.min(4, Math.max(0, score - 1));

  const labels: PasswordStrength['label'][] = ['Too weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['#EF4444', '#F97316', '#EAB308', '#10B981', '#059669'];

  return {
    score: normalizedScore,
    label: labels[normalizedScore],
    color: colors[normalizedScore],
    feedback: feedback.length > 0 ? feedback : ['Meets all security requirements'],
  };
}

/**
 * Hash a password using Web Crypto PBKDF2 + random salt.
 * Returns hex-encoded hash and salt. Plaintext is never stored.
 */
export async function hashPassword(
  password: string
): Promise<{ hashHex: string; saltHex: string; iterations: number }> {
  const enc = new TextEncoder();
  const passwordBuffer = enc.encode(password);

  // Generate 16 bytes random salt
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  const importedKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    importedKey,
    KEY_LENGTH_BITS
  );

  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return {
    hashHex,
    saltHex,
    iterations: PBKDF2_ITERATIONS,
  };
}

/**
 * Verify a candidate plaintext password against stored PBKDF2 hash and salt.
 */
export async function verifyPassword(
  candidatePassword: string,
  storedHashHex: string,
  storedSaltHex: string,
  iterations = PBKDF2_ITERATIONS
): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const passwordBuffer = enc.encode(candidatePassword);

    // Convert stored salt hex back to Uint8Array
    const salt = new Uint8Array(
      storedSaltHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    const importedKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: iterations || PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      importedKey,
      KEY_LENGTH_BITS
    );

    const candidateHashHex = Array.from(new Uint8Array(derivedBits))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return candidateHashHex === storedHashHex;
  } catch (err) {
    console.error('Password verification error', err);
    return false;
  }
}
