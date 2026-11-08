/**
 * Custom Website Studio (AI Studio + GitHub) Validation Helpers
 * Strictly enforces URL safety, domain allow-lists, slug generation,
 * changelog limits, and commit SHA formats.
 */

export const DEFAULT_ALLOWED_PREVIEW_DOMAINS = [
  '*.vercel.app',
  '*.netlify.app',
  '*.pages.dev',
  '*.github.io',
  '*.web.app',
];

export interface PreviewUrlValidationResult {
  valid: boolean;
  error?: string;
  isAllowedDomain: boolean;
  domainWarning?: string;
}

/**
 * Validates preview URLs:
 * - HTTPS only
 * - Reject javascript:, data:, blob:, file:
 * - Reject embedded credentials (user:pass@)
 * - Reject localhost, *.local
 * - Reject 127.x, 10.x, 192.168.x, 172.16-31.x private ranges
 * - Reject all raw IP addresses
 * - Checks against allowed preview domain patterns (e.g. *.vercel.app)
 */
export function validatePreviewUrl(
  urlInput: string,
  allowedDomains: string[] = DEFAULT_ALLOWED_PREVIEW_DOMAINS
): PreviewUrlValidationResult {
  const trimmed = (urlInput || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Preview URL is required.', isAllowedDomain: false };
  }

  // Scheme must be strictly HTTPS
  if (!trimmed.toLowerCase().startsWith('https://')) {
    return {
      valid: false,
      error: 'Preview URL must start with https:// (insecure HTTP and non-web schemes are forbidden).',
      isAllowedDomain: false,
    };
  }

  // Reject embedded credentials
  if (trimmed.includes('@')) {
    return {
      valid: false,
      error: 'Preview URL must not contain embedded user credentials (user:pass@).',
      isAllowedDomain: false,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (err: any) {
    return {
      valid: false,
      error: `Malformed preview URL: ${err?.message || 'invalid format'}.`,
      isAllowedDomain: false,
    };
  }

  if (parsed.protocol !== 'https:') {
    return {
      valid: false,
      error: 'Preview URL must use HTTPS protocol.',
      isAllowedDomain: false,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Reject localhost and local domains
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.localhost')) {
    return {
      valid: false,
      error: 'Localhost and *.local network addresses are strictly prohibited.',
      isAllowedDomain: false,
    };
  }

  // Check IPv4 pattern: 4 numeric octets
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = hostname.match(ipv4Regex);

  if (ipv4Match) {
    const oct1 = parseInt(ipv4Match[1], 10);
    const oct2 = parseInt(ipv4Match[2], 10);
    const oct3 = parseInt(ipv4Match[3], 10);
    const oct4 = parseInt(ipv4Match[4], 10);

    if ([oct1, oct2, oct3, oct4].some((o) => o > 255)) {
      return { valid: false, error: 'Invalid IPv4 address format.', isAllowedDomain: false };
    }

    // 127.x.x.x
    if (oct1 === 127) {
      return { valid: false, error: 'Loopback 127.x IP addresses are prohibited.', isAllowedDomain: false };
    }
    // 10.x.x.x
    if (oct1 === 10) {
      return { valid: false, error: 'Private network 10.x IP addresses are prohibited.', isAllowedDomain: false };
    }
    // 192.168.x.x
    if (oct1 === 192 && oct2 === 168) {
      return { valid: false, error: 'Private network 192.168.x IP addresses are prohibited.', isAllowedDomain: false };
    }
    // 172.16.x.x - 172.31.x.x
    if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) {
      return { valid: false, error: 'Private network 172.16-31.x IP addresses are prohibited.', isAllowedDomain: false };
    }

    // Reject all other raw IPs as well
    return {
      valid: false,
      error: 'Raw IP addresses are forbidden. Please use a valid domain name.',
      isAllowedDomain: false,
    };
  }

  // Reject IPv6 addresses
  if (hostname.includes(':') || hostname.startsWith('[') || /^[0-9a-fA-F:]+$/.test(hostname)) {
    return {
      valid: false,
      error: 'Raw IPv6 addresses are forbidden. Please use a valid domain name.',
      isAllowedDomain: false,
    };
  }

  // Check domain against allowed list
  const isAllowed = isDomainInAllowedList(hostname, allowedDomains);
  if (!isAllowed) {
    return {
      valid: true,
      isAllowedDomain: false,
      domainWarning: `Domain "${hostname}" is outside the default preview allow-list. Confirm you trust this host before saving.`,
    };
  }

  return {
    valid: true,
    isAllowedDomain: true,
  };
}

/**
 * Matches hostname against wildcard domain patterns (*.vercel.app, *.netlify.app, etc.)
 */
export function isDomainInAllowedList(hostname: string, patterns: string[]): boolean {
  const normHost = hostname.toLowerCase();

  return patterns.some((pattern) => {
    const normPattern = pattern.trim().toLowerCase();
    if (!normPattern) return false;

    if (normPattern.startsWith('*.')) {
      const baseDomain = normPattern.slice(2);
      // Matches sub.domain.com or exactly domain.com
      return normHost === baseDomain || normHost.endsWith(`.${baseDomain}`);
    }

    return normHost === normPattern;
  });
}

/**
 * Generates suggested repo name: "site-<client-slug>"
 * Lowercase, a-z 0-9 hyphen, max 40 chars, unique among existing projects.
 */
export function slugifyClientName(name: string, existingSlugs: string[] = []): string {
  if (!name || typeof name !== 'string') return 'site-project';

  // Normalize and strip diacritics
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  // Replace non-alphanumeric with hyphen
  let slug = normalized.replace(/[^a-z0-9]+/g, '-');
  slug = slug.replace(/^-+|-+$/g, '');

  if (!slug) slug = 'project';

  let base = `site-${slug}`;
  if (base.length > 40) {
    base = base.slice(0, 40).replace(/-+$/g, '');
  }

  // Ensure uniqueness
  const existingSet = new Set(existingSlugs.map((s) => s.toLowerCase()));
  if (!existingSet.has(base.toLowerCase())) {
    return base;
  }

  let counter = 2;
  while (counter < 1000) {
    const suffix = `-${counter}`;
    const allowedBaseLen = 40 - suffix.length;
    const truncatedBase = base.slice(0, allowedBaseLen).replace(/-+$/g, '');
    const candidate = `${truncatedBase}${suffix}`;
    if (!existingSet.has(candidate.toLowerCase())) {
      return candidate;
    }
    counter++;
  }

  return base;
}

/**
 * Validates commit SHA (optional, 7-40 hex chars)
 */
export function validateCommitSha(sha?: string): { valid: boolean; error?: string } {
  if (!sha || !sha.trim()) {
    return { valid: true };
  }
  const trimmed = sha.trim();
  if (!/^[0-9a-fA-F]{7,40}$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Commit SHA must be between 7 and 40 hexadecimal characters (0-9, a-f).',
    };
  }
  return { valid: true };
}

/**
 * Validates changelog array: 1-10 bullets, each non-empty and max 200 characters.
 */
export function validateChangelog(bullets: string[]): { valid: boolean; error?: string; cleanBullets: string[] } {
  if (!Array.isArray(bullets)) {
    return { valid: false, error: 'Changelog must be a list of bullet points.', cleanBullets: [] };
  }

  const cleanBullets = bullets.map((b) => (b || '').trim()).filter((b) => b.length > 0);

  if (cleanBullets.length === 0) {
    return {
      valid: false,
      error: 'Changelog is required. Provide at least 1 bullet point describing changes.',
      cleanBullets: [],
    };
  }

  if (cleanBullets.length > 10) {
    return {
      valid: false,
      error: 'Changelog can have at most 10 bullet points.',
      cleanBullets,
    };
  }

  for (let i = 0; i < cleanBullets.length; i++) {
    if (cleanBullets[i].length > 200) {
      return {
        valid: false,
        error: `Bullet point #${i + 1} exceeds 200 characters (length: ${cleanBullets[i].length}).`,
        cleanBullets,
      };
    }
  }

  return { valid: true, cleanBullets };
}
