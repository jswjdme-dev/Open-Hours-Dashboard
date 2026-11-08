/**
 * Open Hours Console - Network Allow-List Module
 *
 * ONLY these hosts may ever be called, and only by the component/part that needs them:
 * - api.github.com
 * - raw.githubusercontent.com
 * - accounts.google.com (specifically: script https://accounts.google.com/gsi/client only)
 * - gmail.googleapis.com
 * - oauth2.googleapis.com (specifically: /revoke endpoint)
 *
 * Everything else is strictly forbidden.
 */

export const ALLOWED_HOSTS = [
  'api.github.com',
  'raw.githubusercontent.com',
  'accounts.google.com',
  'gmail.googleapis.com',
  'oauth2.googleapis.com',
] as const;

export type AllowedHost = typeof ALLOWED_HOSTS[number];

export interface HostValidationResult {
  allowed: boolean;
  host?: string;
  reason?: string;
}

/**
 * Validates a given URL string or Request against the strict allowed-hosts policy.
 */
export function validateAllowedUrl(urlString: string, context?: string): HostValidationResult {
  if (!urlString || typeof urlString !== 'string') {
    return { allowed: false, reason: 'Empty or invalid URL passed.' };
  }

  try {
    const parsed = new URL(urlString, 'http://dummy-base.local');
    const hostname = parsed.hostname.toLowerCase();

    // 1. Host check
    if (!ALLOWED_HOSTS.includes(hostname as AllowedHost)) {
      return {
        allowed: false,
        host: hostname,
        reason: `Host "${hostname}" is not in the network allow-list.`,
      };
    }

    // 2. Host-specific constraint checks
    if (hostname === 'accounts.google.com') {
      // Must only be Google Sign-In script
      const allowedPaths = ['/gsi/client', '/gsi/client.js'];
      if (!allowedPaths.some((p) => parsed.pathname.startsWith(p))) {
        return {
          allowed: false,
          host: hostname,
          reason: `accounts.google.com is only permitted for GSI script (/gsi/client). Path "${parsed.pathname}" is forbidden.`,
        };
      }
    }

    if (hostname === 'oauth2.googleapis.com') {
      // Must only be revocation endpoint
      if (!parsed.pathname.startsWith('/revoke')) {
        return {
          allowed: false,
          host: hostname,
          reason: `oauth2.googleapis.com is only permitted for token revocation (/revoke). Path "${parsed.pathname}" is forbidden.`,
        };
      }
    }

    // Context-specific validations (optional caller check)
    if (context === 'github' && !['api.github.com', 'raw.githubusercontent.com'].includes(hostname)) {
      return {
        allowed: false,
        host: hostname,
        reason: `Context "github" cannot call "${hostname}".`,
      };
    }

    return { allowed: true, host: hostname };
  } catch (err: any) {
    return { allowed: false, reason: `Malformed URL: ${err?.message || 'parse error'}` };
  }
}

/**
 * Asserts that a URL is in the allow-list, throwing an Error if forbidden.
 */
export function assertAllowedHost(urlString: string, context?: string): void {
  const result = validateAllowedUrl(urlString, context);
  if (!result.allowed) {
    throw new Error(`[Network Policy Violation] ${result.reason || 'Forbidden host'}`);
  }
}

/**
 * Safe fetch wrapper that enforces the network allow-list.
 */
export async function allowedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  context?: string
): Promise<Response> {
  const urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  assertAllowedHost(urlString, context);
  return fetch(input, init);
}
