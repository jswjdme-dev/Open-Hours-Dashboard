import { Partner, Client, PartnerPortalBranding } from '../types/index.ts';

export interface PortalTheme {
  isBranded: boolean;
  logoUrl?: string;
  brandName: string;
  accentColor: string;
  contrastTextColor: string;
  poweredByOpenHours: boolean;
}

export const DEFAULT_OPEN_HOURS_THEME: PortalTheme = {
  isBranded: false,
  logoUrl: undefined,
  brandName: 'Open Hours',
  accentColor: '#D92D50',
  contrastTextColor: '#FFFFFF',
  poweredByOpenHours: true,
};

/**
 * Sanitizes SVG XML string by stripping dangerous tags and attributes
 * (such as script, onload, onclick, javascript:, etc.)
 */
export function sanitizeSvg(svgContent: string): string {
  if (!svgContent) return '';
  let sanitized = svgContent;

  // Remove <script> tags and contents
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags that might have url() expressions
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove dangerous attributes like on*, href="javascript:..."
  sanitized = sanitized.replace(/\s*on[a-z]+\s*=\s*(['"]).*?\1/gi, '');
  sanitized = sanitized.replace(/\s*href\s*=\s*(['"])\s*javascript:.*?\1/gi, '');
  sanitized = sanitized.replace(/\s*xlink:href\s*=\s*(['"])\s*javascript:.*?\1/gi, '');

  return sanitized;
}

/**
 * Validates an uploaded logo file:
 * - Allowed types: image/png, image/jpeg, image/svg+xml (.png, .jpg, .jpeg, .svg)
 * - Maximum file size: 2 MB (2 * 1024 * 1024 bytes)
 * - Sanitizes SVGs
 * Returns data URL on success
 */
export async function validateLogoFile(
  file: File
): Promise<{ valid: boolean; error?: string; dataUrl?: string }> {
  const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 2 MB.`,
    };
  }

  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
  const name = file.name.toLowerCase();
  const validExtensions = ['.png', '.jpg', '.jpeg', '.svg'];
  const hasValidExt = validExtensions.some((ext) => name.endsWith(ext));

  if (!validTypes.includes(file.type) && !hasValidExt) {
    return {
      valid: false,
      error: 'Invalid file format. Please upload a PNG, JPG, or SVG file.',
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    if (file.type === 'image/svg+xml' || name.endsWith('.svg')) {
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const cleanSvg = sanitizeSvg(text);
          const encoded = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cleanSvg);
          resolve({ valid: true, dataUrl: encoded });
        } catch {
          resolve({ valid: false, error: 'Could not parse SVG file.' });
        }
      };
      reader.onerror = () => resolve({ valid: false, error: 'Failed to read file.' });
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        resolve({ valid: true, dataUrl: e.target?.result as string });
      };
      reader.onerror = () => resolve({ valid: false, error: 'Failed to read file.' });
      reader.readAsDataURL(file);
    }
  });
}

/**
 * Calculates readable contrast text color (either #FFFFFF or #111111)
 * based on the luminance of the accent color.
 */
export function getContrastTextColor(hexColor: string): string {
  if (!hexColor || !hexColor.startsWith('#')) return '#FFFFFF';

  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  if (hex.length !== 6) return '#FFFFFF';

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Perceived luminance formula (ITU-R BT.709)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.65 ? '#111111' : '#FFFFFF';
}

/**
 * Determines theme for a partner portal
 */
export function getThemeForPartner(partner: Partner): PortalTheme {
  const isBranded = partner.portalType === 'Branded partner portal (partner logo, name, colours)';
  if (!isBranded) {
    return {
      ...DEFAULT_OPEN_HOURS_THEME,
      poweredByOpenHours: partner.poweredByOpenHours ?? true,
    };
  }

  const branding: PartnerPortalBranding = partner.portalBranding || {};
  const accentColor = branding.primaryColor || '#D92D50';
  const contrastTextColor = getContrastTextColor(accentColor);
  const brandName = branding.brandName || partner.organisation || partner.name;

  return {
    isBranded: true,
    logoUrl: branding.logoUrl,
    brandName,
    accentColor,
    contrastTextColor,
    poweredByOpenHours: partner.poweredByOpenHours ?? true,
  };
}

/**
 * Determines theme for a client portal based on partner attribution
 */
export function getThemeForClient(client: Client, partner?: Partner | null): PortalTheme {
  if (!partner) {
    return DEFAULT_OPEN_HOURS_THEME;
  }

  const isBranded = partner.portalType === 'Branded partner portal (partner logo, name, colours)';
  if (!isBranded) {
    return {
      ...DEFAULT_OPEN_HOURS_THEME,
      poweredByOpenHours: partner.poweredByOpenHours ?? true,
    };
  }

  const branding = partner.portalBranding || {};
  const accentColor = branding.primaryColor || '#D92D50';
  const contrastTextColor = getContrastTextColor(accentColor);
  const brandName = branding.brandName || partner.organisation || partner.name;

  return {
    isBranded: true,
    logoUrl: branding.logoUrl,
    brandName,
    accentColor,
    contrastTextColor,
    poweredByOpenHours: partner.poweredByOpenHours ?? true,
  };
}
