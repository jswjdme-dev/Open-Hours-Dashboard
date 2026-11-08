import {
  WebsiteTemplate,
  WebsiteTemplateSection,
  WebsiteTemplateVariantGroup,
  WebsiteProject,
  WebsiteProjectVariation,
  WebsiteProjectBrand,
  DemoSiteDetails,
  DemoSiteBrand,
  DemoSiteService,
  DemoSiteTestimonial,
  DemoSiteImage,
  DemoSiteSocialLink,
} from '../types/index.ts';

// ==========================================
// 1. HTML ESCAPING & SANITIZATION
// ==========================================

export function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Ensures links are strictly limited to safe protocols: https, tel, mailto.
 * Returns empty string or safe fallback if protocol is forbidden.
 */
export function sanitizeUrl(url: string | undefined | null): string {
  if (!url) return '#';
  const trimmed = url.trim();
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('mailto:')
  ) {
    return escapeHtml(trimmed);
  }
  return '#';
}

// ==========================================
// 2. COLOR CONTRAST & WCAG HELPERS
// ==========================================

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 16, g: 24, b: 40 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toH = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toH(r)}${toH(g)}${toH(b)}`;
}

export function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function calculateContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hexToRgb(hex1));
  const lum2 = getRelativeLuminance(hexToRgb(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export function getContrastColor(primaryHex: string): string {
  const whiteContrast = calculateContrastRatio(primaryHex, '#FFFFFF');
  const darkContrast = calculateContrastRatio(primaryHex, '#111111');
  return whiteContrast >= darkContrast ? '#FFFFFF' : '#111111';
}

export function getBrandTint(primaryHex: string): string {
  const rgb = hexToRgb(primaryHex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`;
}

export function isContrastAccessible(hex1: string, hex2: string): boolean {
  return calculateContrastRatio(hex1, hex2) >= 4.5;
}

// ==========================================
// 3. COLOR EXTRACTION FROM LOGO (Canvas)
// ==========================================

export async function extractColorsFromLogo(
  dataUrl: string
): Promise<{ primaryColor: string; secondaryColor: string } | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);

          const size = 64;
          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(img, 0, 0, size, size);

          const imgData = ctx.getImageData(0, 0, size, size).data;
          const colorCounts: Record<string, number> = {};

          for (let i = 0; i < imgData.length; i += 4) {
            const r = imgData[i];
            const g = imgData[i + 1];
            const b = imgData[i + 2];
            const a = imgData[i + 3];

            // Ignore transparent or near-transparent
            if (a < 128) continue;
            // Ignore near-white and near-black
            const isNearWhite = r > 240 && g > 240 && b > 240;
            const isNearBlack = r < 20 && g < 20 && b < 20;
            if (isNearWhite || isNearBlack) continue;

            // Quantize to bucket of 16
            const qr = Math.round(r / 16) * 16;
            const qg = Math.round(g / 16) * 16;
            const qb = Math.round(b / 16) * 16;
            const hex = rgbToHex(qr, qg, qb);
            colorCounts[hex] = (colorCounts[hex] || 0) + 1;
          }

          const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
          if (sorted.length > 0) {
            const primary = sorted[0][0];
            const secondary = sorted.length > 1 ? sorted[1][0] : '#101828';
            resolve({ primaryColor: primary, secondaryColor: secondary });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    } catch {
      resolve(null);
    }
  });
}

// ==========================================
// 4. TEMPLATE MARKER DETECTION
// ==========================================

export function detectTemplateSections(html: string): WebsiteTemplateSection[] {
  const sections: WebsiteTemplateSection[] = [];
  const regex = /<!--section:([a-zA-Z0-9_-]+)(?:\s+label="([^"]*)")?(?:\s+default="(on|off)")?-->/gi;
  let match;
  const seen = new Set<string>();
  while ((match = regex.exec(html)) !== null) {
    const id = match[1];
    if (!seen.has(id)) {
      seen.add(id);
      sections.push({
        id,
        label: match[2] || id.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        defaultOn: match[3] !== 'off',
      });
    }
  }
  return sections;
}

export function detectTemplateVariants(html: string): WebsiteTemplateVariantGroup[] {
  const groupsMap = new Map<string, Set<string>>();
  const regex = /<!--variant:([a-zA-Z0-9_-]+)\s+option="([^"]*)"-->/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const group = match[1];
    const option = match[2];
    if (!groupsMap.has(group)) {
      groupsMap.set(group, new Set());
    }
    groupsMap.get(group)!.add(option);
  }

  const result: WebsiteTemplateVariantGroup[] = [];
  groupsMap.forEach((opts, group) => {
    result.push({
      group,
      options: Array.from(opts),
    });
  });
  return result;
}

// ==========================================
// 5. TEMPLATE VALIDATOR ON SAVE
// ==========================================

export function validateTemplateHtml(html: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!html || html.trim().length === 0) {
    errors.push('Template HTML cannot be empty.');
    return { valid: false, errors };
  }

  // 1. Max 300 KB limit
  const byteLength = new Blob([html]).size;
  if (byteLength > 300 * 1024) {
    errors.push(`Template exceeds 300 KB size limit (current size: ${(byteLength / 1024).toFixed(1)} KB).`);
  }

  // 2. Reject <script> tags
  if (/<script\b/i.test(html) || /<\/script>/i.test(html)) {
    errors.push('<script> tags are strictly forbidden for security.');
  }

  // 3. Reject inline event handlers (on* attributes)
  if (/\bon[a-z]+\s*=/i.test(html)) {
    errors.push('Inline event handlers (e.g. onclick, onload, onerror) are strictly forbidden.');
  }

  // 4. Reject javascript: URLs
  if (/javascript\s*:/i.test(html)) {
    errors.push('javascript: URL schemes are strictly forbidden.');
  }

  // 5. Reject <iframe>, <object>, <embed>
  if (/<iframe\b/i.test(html)) {
    errors.push('<iframe> tags are not permitted inside templates.');
  }
  if (/<object\b/i.test(html)) {
    errors.push('<object> tags are not permitted inside templates.');
  }
  if (/<embed\b/i.test(html)) {
    errors.push('<embed> tags are not permitted inside templates.');
  }

  // 6. Reject <form action> pointing to external hosts
  if (/<form\b[^>]*\baction\s*=\s*['"]?https?:\/\//i.test(html)) {
    errors.push('External <form action> destinations are forbidden. Use mailto: or safe relative actions.');
  }

  // 7. Reject external <link> stylesheets
  if (/<link\b[^>]*\bhref\s*=\s*['"]?https?:\/\//i.test(html)) {
    errors.push('External stylesheets (<link href="http...">) are forbidden. Use inline <style> blocks.');
  }

  // 8. Reject external <img> sources (allow data: and relative only)
  if (/<img\b[^>]*\bsrc\s*=\s*['"]?https?:\/\//i.test(html)) {
    errors.push('External image URLs (src="http...") are forbidden. Use data: URIs or template {{logo}}/{{#images}} tags.');
  }

  // 9. Reject CSS @import and url(http...)
  if (/@import\s+(?:url\s*\(\s*['"]?https?:|['"]https?:)/i.test(html)) {
    errors.push('External CSS @import rules are forbidden. All CSS must be self-contained inline.');
  }
  if (/url\s*\(\s*['"]?https?:\/\//i.test(html)) {
    errors.push('External url(...) references are forbidden in CSS.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ==========================================
// 6. SAFE TEMPLATE RENDERER
// ==========================================

export function renderWebsiteTemplate(
  templateHtml: string,
  details: DemoSiteDetails,
  brand: DemoSiteBrand & { radius?: number; density?: 'compact' | 'normal' | 'airy' },
  options?: {
    withRibbon?: boolean;
    ribbonText?: string;
    variation?: WebsiteProjectVariation;
  }
): string {
  let rendered = templateHtml || '';
  const variation = options?.variation;

  // 1. Process Section Markers: Reordering & Visibility
  // Regex matches: <!--section:ID [label="..."] [default="..."]-->...<!--/section-->
  const sectionBlocks: Record<string, string> = {};
  const sectionOrderFound: string[] = [];

  const sectionRegex = /<!--section:([a-zA-Z0-9_-]+)(?:\s+label="[^"]*")?(?:\s+default="(?:on|off)")?-->([\s\S]*?)<!--\/section-->/gi;
  let match;
  while ((match = sectionRegex.exec(rendered)) !== null) {
    const secId = match[1];
    sectionBlocks[secId] = match[2];
    if (!sectionOrderFound.includes(secId)) {
      sectionOrderFound.push(secId);
    }
  }

  // If section markers exist, assemble them according to variation
  if (sectionOrderFound.length > 0) {
    let replacedFirst = false;
    // Replace first occurrence with placeholder, and subsequent ones with blank
    rendered = rendered.replace(sectionRegex, (fullMatch, secId) => {
      if (!replacedFirst) {
        replacedFirst = true;
        return `<!--__SECTIONS_OUTLET__-->`;
      }
      return '';
    });

    const targetOrder =
      variation?.sectionOrder && variation.sectionOrder.length > 0
        ? variation.sectionOrder
        : sectionOrderFound;

    const assembledSections: string[] = [];
    for (const secId of targetOrder) {
      // Check if section is toggled off
      if (variation?.sectionsOn && variation.sectionsOn[secId] === false) {
        continue;
      }
      // Never fabricate content: if testimonials section and no testimonials supplied, auto-remove
      if (secId === 'testimonials' && (!details.testimonials || details.testimonials.length === 0)) {
        continue;
      }

      if (sectionBlocks[secId]) {
        assembledSections.push(sectionBlocks[secId]);
      }
    }

    rendered = rendered.replace(`<!--__SECTIONS_OUTLET__-->`, assembledSections.join('\n'));
  }

  // 2. Process Variant Markers
  // Pattern: <!--variant:GROUP option="OPTION"-->...<!--/variant-->
  const variantRegex = /<!--variant:([a-zA-Z0-9_-]+)\s+option="([^"]*)"-->([\s\S]*?)<!--\/variant-->/gi;
  rendered = rendered.replace(variantRegex, (fullMatch, group, option, innerContent) => {
    const selectedOption = variation?.variants?.[group];
    if (selectedOption) {
      return selectedOption === option ? innerContent : '';
    }
    // Default: keep first option encountered per group
    return innerContent;
  });

  // 3. Brand Colors & CSS Variables Injection
  const primaryContrast = getContrastColor(brand.primaryColor || '#D92D50');
  const brandTint = getBrandTint(brand.primaryColor || '#D92D50');
  const fontBody = brand.fontStack || 'system-ui, -apple-system, sans-serif';
  const radius = typeof brand.radius === 'number' ? `${brand.radius}px` : '12px';
  const spaceUnit =
    brand.density === 'compact' ? '4px' : brand.density === 'airy' ? '12px' : '8px';

  const cssVarsStyle = `
    :root {
      --brand-primary: ${brand.primaryColor || '#D92D50'};
      --brand-secondary: ${brand.secondaryColor || '#101828'};
      --brand-primary-contrast: ${primaryContrast};
      --brand-tint: ${brandTint};
      --font-body: ${fontBody};
      --radius: ${radius};
      --space-unit: ${spaceUnit};
    }
  `;

  if (rendered.includes('</head>')) {
    rendered = rendered.replace('</head>', `<style id="oh-brand-vars">${cssVarsStyle}</style></head>`);
  } else {
    rendered = `<style id="oh-brand-vars">${cssVarsStyle}</style>${rendered}`;
  }

  // 4. Conditionals: {{#if key}}...{{/if}}
  const evaluateCondition = (key: string): boolean => {
    const k = key.trim();
    switch (k) {
      case 'phone':
        return Boolean(details.phone && details.phone.trim().length > 0);
      case 'email':
        return Boolean(details.email && details.email.trim().length > 0);
      case 'address':
        return Boolean(details.address && details.address.trim().length > 0);
      case 'opening_hours':
        return Boolean(details.openingHours && details.openingHours.trim().length > 0);
      case 'tagline':
        return Boolean(details.tagline && details.tagline.trim().length > 0);
      case 'about':
        return Boolean(details.about && details.about.trim().length > 0);
      case 'logo':
        return Boolean(brand.logoDataUrl && brand.logoDataUrl.trim().length > 0);
      case 'cta_text':
        return Boolean(details.ctaText && details.ctaText.trim().length > 0);
      case 'cta_link':
        return Boolean(details.ctaLink && details.ctaLink.trim().length > 0);
      case 'services':
        return Boolean(details.services && details.services.length > 0);
      case 'testimonials':
        return Boolean(details.testimonials && details.testimonials.length > 0);
      case 'images':
        return Boolean(details.images && details.images.length > 0);
      case 'social_links':
        return Boolean(details.socialLinks && details.socialLinks.length > 0);
      default:
        return false;
    }
  };

  rendered = rendered.replace(/\{\{#if\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/if\}\}/gi, (_, key, content) => {
    return evaluateCondition(key) ? content : '';
  });

  // 5. Repeaters:
  // {{#services}}...{{title}}...{{text}}...{{/services}} (up to 8)
  rendered = rendered.replace(/\{\{#services\}\}([\s\S]*?)\{\{\/services\}\}/gi, (_, itemTpl) => {
    if (!details.services || details.services.length === 0) return '';
    return details.services
      .slice(0, 8)
      .map((srv, idx) => {
        return itemTpl
          .replace(/\{\{title\}\}/g, escapeHtml(srv.title))
          .replace(/\{\{text\}\}/g, escapeHtml(srv.text))
          .replace(/\{\{index\}\}/g, String(idx + 1));
      })
      .join('');
  });

  // {{#testimonials}}...{{quote}}...{{author}}...{{role}}...{{/testimonials}}
  rendered = rendered.replace(/\{\{#testimonials\}\}([\s\S]*?)\{\{\/testimonials\}\}/gi, (_, itemTpl) => {
    if (!details.testimonials || details.testimonials.length === 0) return '';
    return details.testimonials
      .map((t) => {
        return itemTpl
          .replace(/\{\{quote\}\}/g, escapeHtml(t.quote))
          .replace(/\{\{author\}\}/g, escapeHtml(t.author))
          .replace(/\{\{role\}\}/g, escapeHtml(t.role || ''));
      })
      .join('');
  });

  // {{#images}}...{{url}}...{{caption}}...{{/images}}
  rendered = rendered.replace(/\{\{#images\}\}([\s\S]*?)\{\{\/images\}\}/gi, (_, itemTpl) => {
    if (!details.images || details.images.length === 0) return '';
    return details.images
      .map((img) => {
        const safeUrl = img.url && (img.url.startsWith('data:') || img.url.startsWith('https://'))
          ? img.url
          : '';
        return itemTpl
          .replace(/\{\{url\}\}/g, escapeHtml(safeUrl))
          .replace(/\{\{caption\}\}/g, escapeHtml(img.caption || ''));
      })
      .join('');
  });

  // {{#social_links}}...{{platform}}...{{url}}...{{/social_links}}
  rendered = rendered.replace(/\{\{#social_links\}\}([\s\S]*?)\{\{\/social_links\}\}/gi, (_, itemTpl) => {
    if (!details.socialLinks || details.socialLinks.length === 0) return '';
    return details.socialLinks
      .map((s) => {
        return itemTpl
          .replace(/\{\{platform\}\}/g, escapeHtml(s.platform))
          .replace(/\{\{url\}\}/g, sanitizeUrl(s.url));
      })
      .join('');
  });

  // 6. Scalar Placeholders (Escaped)
  const logoHtml = brand.logoDataUrl
    ? `<img src="${brand.logoDataUrl}" alt="${escapeHtml(details.businessName)}" style="max-height: 48px; width: auto; object-fit: contain; display: inline-block; border-radius: var(--radius, 8px);" />`
    : '';

  rendered = rendered
    .replace(/\{\{business_name\}\}/g, escapeHtml(details.businessName || 'Business Name'))
    .replace(/\{\{tagline\}\}/g, escapeHtml(details.tagline || ''))
    .replace(/\{\{about\}\}/g, escapeHtml(details.about || ''))
    .replace(/\{\{logo\}\}/g, logoHtml)
    .replace(/\{\{phone\}\}/g, escapeHtml(details.phone || ''))
    .replace(/\{\{email\}\}/g, escapeHtml(details.email || ''))
    .replace(/\{\{address\}\}/g, escapeHtml(details.address || ''))
    .replace(/\{\{opening_hours\}\}/g, escapeHtml(details.openingHours || ''))
    .replace(/\{\{cta_text\}\}/g, escapeHtml(details.ctaText || 'Get in Touch'))
    .replace(/\{\{cta_link\}\}/g, sanitizeUrl(details.ctaLink || '#'))
    .replace(/\{\{year\}\}/g, new Date().getFullYear().toString());

  // 7. Inject "Concept mockup - not a live website" Ribbon
  if (options?.withRibbon !== false) {
    const ribbonText = options?.ribbonText || 'Concept mockup — not a live website';
    const ribbonHtml = `
      <div id="oh-demo-ribbon" style="background:#101828;color:#FFFFFF;text-align:center;padding:7px 12px;font-family:system-ui,-apple-system,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.02em;position:sticky;top:0;z-index:999999;box-shadow:0 1px 3px rgba(0,0,0,0.15);width:100%;box-sizing:border-box;">
        ${escapeHtml(ribbonText)}
      </div>
    `;

    if (rendered.includes('<body')) {
      rendered = rendered.replace(/(<body[^>]*>)/i, `$1\n${ribbonHtml}`);
    } else {
      rendered = `${ribbonHtml}\n${rendered}`;
    }
  }

  return rendered;
}

// ==========================================
// 7. VARIATION SIMILARITY CHECKER
// ==========================================

export function calculateVariationSimilarity(
  current: {
    templateId: string;
    brand: WebsiteProjectBrand;
    variation: WebsiteProjectVariation;
  },
  existing: WebsiteProject
): { percentage: number; similar: boolean; reasons: string[] } {
  // Different templates are not similar
  if (current.templateId !== existing.templateId) {
    return { percentage: 0, similar: false, reasons: [] };
  }

  const reasons: string[] = [];
  let score = 0;
  let totalWeight = 0;

  // 1. Section Order comparison (Weight: 25)
  totalWeight += 25;
  const orderA = current.variation.sectionOrder || [];
  const orderB = existing.variation.sectionOrder || [];
  if (orderA.length > 0 && orderB.length > 0) {
    let matchCount = 0;
    const maxLen = Math.max(orderA.length, orderB.length);
    for (let i = 0; i < maxLen; i++) {
      if (orderA[i] === orderB[i]) matchCount++;
    }
    const orderSimilarity = matchCount / maxLen;
    score += orderSimilarity * 25;
    if (orderSimilarity > 0.8) {
      reasons.push('Identical or nearly identical section order');
    }
  } else {
    score += 25; // Default matching order
  }

  // 2. Sections On/Off comparison (Weight: 20)
  totalWeight += 20;
  const keysA = Object.keys(current.variation.sectionsOn || {});
  const keysB = Object.keys(existing.variation.sectionsOn || {});
  const allKeys = Array.from(new Set([...keysA, ...keysB]));
  if (allKeys.length > 0) {
    let matches = 0;
    allKeys.forEach((k) => {
      const onA = current.variation.sectionsOn?.[k] !== false;
      const onB = existing.variation.sectionsOn?.[k] !== false;
      if (onA === onB) matches++;
    });
    const onSimilarity = matches / allKeys.length;
    score += onSimilarity * 20;
    if (onSimilarity > 0.8) {
      reasons.push('Matching section visibility toggles');
    }
  } else {
    score += 20;
  }

  // 3. Variant Choices comparison (Weight: 25)
  totalWeight += 25;
  const vKeysA = Object.keys(current.variation.variants || {});
  const vKeysB = Object.keys(existing.variation.variants || {});
  const allVKeys = Array.from(new Set([...vKeysA, ...vKeysB]));
  if (allVKeys.length > 0) {
    let matches = 0;
    allVKeys.forEach((k) => {
      if (current.variation.variants?.[k] === existing.variation.variants?.[k]) {
        matches++;
      }
    });
    const variantSimilarity = matches / allVKeys.length;
    score += variantSimilarity * 25;
    if (variantSimilarity > 0.8) {
      reasons.push('Matching variant layout choices');
    }
  } else {
    score += 25;
  }

  // 4. Color & Style comparison (Weight: 30)
  totalWeight += 30;
  let styleScore = 0;
  if (current.brand.primaryColor.toLowerCase() === existing.brand.primaryColor.toLowerCase()) {
    styleScore += 10;
    reasons.push('Identical primary brand color');
  }
  if (current.brand.secondaryColor.toLowerCase() === existing.brand.secondaryColor.toLowerCase()) {
    styleScore += 8;
  }
  if (current.brand.fontStack === existing.brand.fontStack) {
    styleScore += 4;
  }
  if (current.brand.radius === existing.brand.radius) {
    styleScore += 4;
  }
  if (current.brand.density === existing.brand.density) {
    styleScore += 4;
  }
  score += styleScore;

  const percentage = Math.round((score / totalWeight) * 100);
  return {
    percentage,
    similar: percentage >= 80,
    reasons,
  };
}

// ==========================================
// 8. SHUFFLE GENERATOR
// ==========================================

export function shuffleVariation(
  sections: WebsiteTemplateSection[],
  variants: WebsiteTemplateVariantGroup[],
  locks: {
    sectionOrder?: boolean;
    variants?: boolean;
    colors?: boolean;
    font?: boolean;
    radius?: boolean;
    density?: boolean;
  },
  currentVariation: WebsiteProjectVariation,
  currentBrand: WebsiteProjectBrand
): { variation: WebsiteProjectVariation; brand: WebsiteProjectBrand } {
  const newSeed = Math.floor(Math.random() * 1000000);

  // 1. Section order shuffle (keeping hero first if exists)
  let newOrder = [...currentVariation.sectionOrder];
  if (!locks.sectionOrder && sections.length > 0) {
    const secIds = sections.map((s) => s.id);
    const hasHero = secIds.includes('hero');
    const remaining = secIds.filter((id) => id !== 'hero');

    // Fisher-Yates shuffle
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    newOrder = hasHero ? ['hero', ...remaining] : remaining;
  }

  // 2. Variants shuffle
  const newVariants = { ...currentVariation.variants };
  if (!locks.variants && variants.length > 0) {
    variants.forEach((v) => {
      if (v.options.length > 0) {
        const randomOpt = v.options[Math.floor(Math.random() * v.options.length)];
        newVariants[v.group] = randomOpt;
      }
    });
  }

  // 3. Brand & Style shuffle
  const newBrand: WebsiteProjectBrand = { ...currentBrand };

  const PALETTES = [
    { primary: '#D92D50', secondary: '#101828' }, // Crimson & Slate
    { primary: '#0284C7', secondary: '#0F172A' }, // Ocean & Deep Navy
    { primary: '#059669', secondary: '#111827' }, // Emerald & Charcoal
    { primary: '#7C3AED', secondary: '#1E1B4B' }, // Violet & Obsidian
    { primary: '#D97706', secondary: '#18181B' }, // Amber & Zinc
    { primary: '#0D9488', secondary: '#134E4A' }, // Teal & Deep Forest
  ];

  if (!locks.colors) {
    const picked = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    newBrand.primaryColor = picked.primary;
    newBrand.secondaryColor = picked.secondary;
  }

  const FONTS = [
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    '"Trebuchet MS", "Lucida Grande", sans-serif',
    'Georgia, Cambria, "Times New Roman", serif',
    'Garamond, "Baskerville", serif',
  ];

  if (!locks.font) {
    newBrand.fontStack = FONTS[Math.floor(Math.random() * FONTS.length)];
  }

  const RADIUS_OPTIONS = [0, 6, 12, 16, 24];
  if (!locks.radius) {
    newBrand.radius = RADIUS_OPTIONS[Math.floor(Math.random() * RADIUS_OPTIONS.length)];
  }

  const DENSITY_OPTIONS: Array<'compact' | 'normal' | 'airy'> = ['compact', 'normal', 'airy'];
  if (!locks.density) {
    newBrand.density = DENSITY_OPTIONS[Math.floor(Math.random() * DENSITY_OPTIONS.length)];
  }

  return {
    variation: {
      ...currentVariation,
      sectionOrder: newOrder,
      variants: newVariants,
      seed: newSeed,
    },
    brand: newBrand,
  };
}

// ==========================================
// 9. THREE NEUTRAL SAMPLE TEMPLATES
// WITH SECTION & VARIANT MARKERS
// ==========================================

export const SAMPLE_TEMPLATES: Array<Omit<WebsiteTemplate, 'createdAt' | 'updatedAt'>> = [
  {
    id: 'tpl_sample_01',
    name: 'Sample: Minimal Studio',
    description: 'Clean, minimalist one-page hero, services overview, about section, and contact strip with subtle brand accents.',
    nicheTags: ['Clean', 'Minimal', 'General Practice', 'Studio'],
    sections: [
      { id: 'hero', label: 'Hero Banner', defaultOn: true },
      { id: 'about', label: 'About Practice', defaultOn: true },
      { id: 'services', label: 'Key Services', defaultOn: true },
      { id: 'testimonials', label: 'Testimonials', defaultOn: true },
      { id: 'contact', label: 'Contact & Hours', defaultOn: true },
    ],
    variants: [
      { group: 'hero-layout', options: ['split', 'centered'] },
      { group: 'services-style', options: ['cards', 'list'] },
    ],
    version: 1,
    archivedAt: null,
    isDemo: true,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{business_name}}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-body, system-ui, sans-serif);
      color: #101828;
      background: #FFFFFF;
      line-height: 1.6;
    }
    header {
      padding: calc(var(--space-unit, 8px) * 2) calc(var(--space-unit, 8px) * 3);
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #ECEEF2;
      background: #FFFFFF;
    }
    .brand-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--brand-secondary, #101828);
      text-decoration: none;
    }
    .container {
      max-width: 1040px;
      margin: 0 auto;
      padding: calc(var(--space-unit, 8px) * 4) calc(var(--space-unit, 8px) * 3);
    }
    .btn-cta {
      display: inline-block;
      background: var(--brand-primary, #D92D50);
      color: var(--brand-primary-contrast, #FFFFFF);
      padding: calc(var(--space-unit, 8px) * 1.5) calc(var(--space-unit, 8px) * 3);
      border-radius: var(--radius, 9999px);
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
      transition: opacity 0.2s;
    }
    .btn-cta:hover { opacity: 0.9; }

    /* Hero Variants */
    .hero-centered { text-align: center; max-width: 800px; margin: 0 auto; padding: calc(var(--space-unit, 8px) * 5) 0; }
    .hero-centered h1 { font-size: 2.75rem; font-weight: 800; color: var(--brand-secondary, #101828); margin-bottom: 1.25rem; line-height: 1.15; }
    .hero-centered p { font-size: 1.15rem; color: #475467; margin-bottom: 2rem; }

    .hero-split { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center; padding: calc(var(--space-unit, 8px) * 5) 0; }
    .hero-split h1 { font-size: 2.5rem; font-weight: 800; color: var(--brand-secondary, #101828); margin-bottom: 1.25rem; line-height: 1.15; }
    .hero-split p { font-size: 1.1rem; color: #475467; margin-bottom: 2rem; }
    .hero-split-box { background: var(--brand-tint, #FAFAFA); border-radius: var(--radius, 16px); padding: 2.5rem; border: 1px solid rgba(0,0,0,0.05); }

    /* Services Variants */
    .services-grid-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; margin-top: 2rem; }
    .service-card { padding: 1.75rem; border: 1px solid #ECEEF2; border-radius: var(--radius, 12px); background: #FFFFFF; }
    .service-card h3 { font-size: 1.15rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--brand-secondary, #101828); }
    .service-card p { font-size: 0.9rem; color: #475467; }

    .services-grid-list { display: flex; flex-direction: column; gap: 1rem; margin-top: 2rem; }
    .service-list-item { padding: 1.25rem; border-left: 4px solid var(--brand-primary, #D92D50); background: #F9FAFB; border-radius: 0 var(--radius, 8px) var(--radius, 8px) 0; }
    .service-list-item h3 { font-size: 1.1rem; font-weight: 700; color: var(--brand-secondary, #101828); margin-bottom: 0.25rem; }
    .service-list-item p { font-size: 0.9rem; color: #475467; }

    /* About, Testimonials & Contact */
    .section-title { font-size: 1.85rem; font-weight: 700; color: var(--brand-secondary, #101828); margin-bottom: 1rem; }
    .about-box { background: var(--brand-tint, #FAFAFA); border-radius: var(--radius, 16px); padding: 2.5rem; margin-top: 1rem; }
    .testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-top: 1.5rem; }
    .testimonial-box { padding: 1.5rem; border: 1px solid #ECEEF2; border-radius: var(--radius, 12px); background: #FFFFFF; }
    .contact-strip { background: var(--brand-secondary, #101828); color: #FFFFFF; border-radius: var(--radius, 16px); padding: 3rem 2rem; margin-top: 2rem; }
    footer { padding: 2.5rem; text-align: center; font-size: 0.85rem; color: #667085; border-top: 1px solid #ECEEF2; }

    @media (max-width: 768px) {
      .hero-split { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      {{#if logo}}{{logo}}{{/if}}
      <a href="#" class="brand-title">{{business_name}}</a>
    </div>
    <div style="display: flex; align-items: center; gap: 1rem;">
      {{#if phone}}<a href="tel:{{phone}}" style="color: #475467; text-decoration: none; font-size: 0.9rem; font-weight: 500;">{{phone}}</a>{{/if}}
      {{#if cta_text}}<a href="{{cta_link}}" class="btn-cta">{{cta_text}}</a>{{/if}}
    </div>
  </header>

  <!--section:hero label="Hero Banner" default="on"-->
  <section class="container">
    <!--variant:hero-layout option="split"-->
    <div class="hero-split">
      <div>
        <h1>{{business_name}}</h1>
        {{#if tagline}}<p>{{tagline}}</p>{{/if}}
        {{#if cta_text}}<a href="{{cta_link}}" class="btn-cta">{{cta_text}}</a>{{/if}}
      </div>
      <div class="hero-split-box">
        <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--brand-secondary, #101828);">Convenient & Accessible</h3>
        {{#if opening_hours}}<p style="font-size: 0.9rem; color: #475467; margin-bottom: 0.5rem;"><strong>Hours:</strong> {{opening_hours}}</p>{{/if}}
        {{#if address}}<p style="font-size: 0.9rem; color: #475467;"><strong>Location:</strong> {{address}}</p>{{/if}}
      </div>
    </div>
    <!--/variant-->

    <!--variant:hero-layout option="centered"-->
    <div class="hero-centered">
      <h1>{{business_name}}</h1>
      {{#if tagline}}<p>{{tagline}}</p>{{/if}}
      {{#if cta_text}}<a href="{{cta_link}}" class="btn-cta">{{cta_text}}</a>{{/if}}
    </div>
    <!--/variant-->
  </section>
  <!--/section-->

  <!--section:about label="About Practice" default="on"-->
  {{#if about}}
  <section class="container">
    <div class="about-box">
      <h2 class="section-title">About Us</h2>
      <p style="font-size: 1.05rem; color: #344054; max-width: 800px; line-height: 1.7;">{{about}}</p>
    </div>
  </section>
  {{/if}}
  <!--/section-->

  <!--section:services label="Key Services" default="on"-->
  {{#if services}}
  <section class="container">
    <h2 class="section-title">Services & Care</h2>
    <!--variant:services-style option="cards"-->
    <div class="services-grid-cards">
      {{#services}}
      <div class="service-card">
        <h3>{{title}}</h3>
        <p>{{text}}</p>
      </div>
      {{/services}}
    </div>
    <!--/variant-->

    <!--variant:services-style option="list"-->
    <div class="services-grid-list">
      {{#services}}
      <div class="service-list-item">
        <h3>{{title}}</h3>
        <p>{{text}}</p>
      </div>
      {{/services}}
    </div>
    <!--/variant-->
  </section>
  {{/if}}
  <!--/section-->

  <!--section:testimonials label="Testimonials" default="on"-->
  {{#if testimonials}}
  <section class="container">
    <h2 class="section-title">Client Feedback</h2>
    <div class="testimonials-grid">
      {{#testimonials}}
      <div class="testimonial-box">
        <p style="font-style: italic; color: #344054; margin-bottom: 0.75rem;">&ldquo;{{quote}}&rdquo;</p>
        <p style="font-weight: 600; font-size: 0.85rem; color: var(--brand-secondary, #101828);">{{author}} {{#if role}}&bull; {{role}}{{/if}}</p>
      </div>
      {{/testimonials}}
    </div>
  </section>
  {{/if}}
  <!--/section-->

  <!--section:contact label="Contact & Hours" default="on"-->
  <section class="container">
    <div class="contact-strip">
      <h2 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 1.25rem;">Contact & Location</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem;">
        {{#if address}}
        <div>
          <p style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7; margin-bottom: 0.25rem;">Address</p>
          <p style="font-size: 0.95rem;">{{address}}</p>
        </div>
        {{/if}}
        {{#if opening_hours}}
        <div>
          <p style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7; margin-bottom: 0.25rem;">Opening Hours</p>
          <p style="font-size: 0.95rem;">{{opening_hours}}</p>
        </div>
        {{/if}}
        {{#if phone}}
        <div>
          <p style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7; margin-bottom: 0.25rem;">Telephone</p>
          <p style="font-size: 0.95rem;"><a href="tel:{{phone}}" style="color: #FFFFFF; text-decoration: underline;">{{phone}}</a></p>
        </div>
        {{/if}}
        {{#if email}}
        <div>
          <p style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7; margin-bottom: 0.25rem;">Email</p>
          <p style="font-size: 0.95rem;"><a href="mailto:{{email}}" style="color: #FFFFFF; text-decoration: underline;">{{email}}</a></p>
        </div>
        {{/if}}
      </div>
    </div>
  </section>
  <!--/section-->

  <footer>
    <p>&copy; {{year}} {{business_name}}. All rights reserved.</p>
  </footer>
</body>
</html>`,
  },
  {
    id: 'tpl_sample_02',
    name: 'Sample: Modern Clinic',
    description: 'Structured layout with prominent contact bar, highlighted services grid, and warm typography.',
    nicheTags: ['Modern', 'Healthcare', 'Clinic', 'Professional'],
    sections: [
      { id: 'hero', label: 'Hero Header', defaultOn: true },
      { id: 'services', label: 'Services Overview', defaultOn: true },
      { id: 'about', label: 'Practice Background', defaultOn: true },
      { id: 'testimonials', label: 'Patient Reviews', defaultOn: true },
      { id: 'contact', label: 'Opening Times & Contact', defaultOn: true },
    ],
    variants: [
      { group: 'banner-style', options: ['card', 'clean'] },
      { group: 'about-layout', options: ['column', 'sidebar'] },
    ],
    version: 1,
    archivedAt: null,
    isDemo: true,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{business_name}}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-body, system-ui, sans-serif);
      color: #1F2937;
      background: #F9FAFB;
      line-height: 1.6;
    }
    .top-bar {
      background: var(--brand-secondary, #101828);
      color: #FFFFFF;
      padding: 0.6rem 2rem;
      font-size: 0.85rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    header {
      padding: calc(var(--space-unit, 8px) * 2) calc(var(--space-unit, 8px) * 3);
      background: #FFFFFF;
      border-bottom: 1px solid #E5E7EB;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .container {
      max-width: 1040px;
      margin: 0 auto;
      padding: calc(var(--space-unit, 8px) * 4) calc(var(--space-unit, 8px) * 3);
    }
    .btn-action {
      background: var(--brand-primary, #D92D50);
      color: var(--brand-primary-contrast, #FFFFFF);
      padding: calc(var(--space-unit, 8px) * 1.5) calc(var(--space-unit, 8px) * 3);
      border-radius: var(--radius, 8px);
      text-decoration: none;
      font-weight: 700;
      font-size: 0.95rem;
      display: inline-block;
    }

    /* Hero Variants */
    .banner-card { background: #FFFFFF; border-radius: var(--radius, 16px); padding: 3rem 2.5rem; border: 1px solid #E5E7EB; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .banner-clean { padding: 3rem 0; text-align: left; }

    /* About Variants */
    .about-column { background: #FFFFFF; border-radius: var(--radius, 12px); padding: 2.5rem; border: 1px solid #E5E7EB; }
    .about-sidebar { display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; background: #FFFFFF; border-radius: var(--radius, 12px); padding: 2.5rem; border: 1px solid #E5E7EB; }

    .service-card { background: #FFFFFF; padding: 1.5rem; border-radius: var(--radius, 10px); border: 1px solid #E5E7EB; }
    footer { padding: 2.5rem; text-align: center; font-size: 0.85rem; color: #6B7280; background: #FFFFFF; border-top: 1px solid #E5E7EB; }
  </style>
</head>
<body>
  <div class="top-bar">
    <span>{{#if address}}{{address}}{{/if}}</span>
    <span>{{#if phone}}Call: <a href="tel:{{phone}}" style="color:#FFF;font-weight:600;">{{phone}}</a>{{/if}}</span>
  </div>
  <header>
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      {{#if logo}}{{logo}}{{/if}}
      <h2 style="font-size: 1.3rem; font-weight: 800; color: var(--brand-secondary, #101828);">{{business_name}}</h2>
    </div>
    {{#if cta_text}}<a href="{{cta_link}}" class="btn-action">{{cta_text}}</a>{{/if}}
  </header>

  <!--section:hero label="Hero Header" default="on"-->
  <section class="container">
    <!--variant:banner-style option="card"-->
    <div class="banner-card">
      <h1 style="font-size: 2.5rem; font-weight: 800; color: var(--brand-secondary, #101828); line-height: 1.2; margin-bottom: 1rem;">{{business_name}}</h1>
      {{#if tagline}}<p style="font-size: 1.15rem; color: #4B5563; margin-bottom: 1.75rem; max-width: 700px;">{{tagline}}</p>{{/if}}
      {{#if cta_text}}<a href="{{cta_link}}" class="btn-action">{{cta_text}}</a>{{/if}}
    </div>
    <!--/variant-->

    <!--variant:banner-style option="clean"-->
    <div class="banner-clean">
      <h1 style="font-size: 2.5rem; font-weight: 800; color: var(--brand-secondary, #101828); line-height: 1.2; margin-bottom: 1rem;">{{business_name}}</h1>
      {{#if tagline}}<p style="font-size: 1.15rem; color: #4B5563; margin-bottom: 1.75rem; max-width: 700px;">{{tagline}}</p>{{/if}}
      {{#if cta_text}}<a href="{{cta_link}}" class="btn-action">{{cta_text}}</a>{{/if}}
    </div>
    <!--/variant-->
  </section>
  <!--/section-->

  <!--section:services label="Services Overview" default="on"-->
  {{#if services}}
  <section class="container">
    <h2 style="font-size: 1.75rem; font-weight: 800; color: var(--brand-secondary, #101828); margin-bottom: 1.5rem;">Clinical Focus & Services</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
      {{#services}}
      <div class="service-card">
        <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--brand-primary, #D92D50); margin-bottom: 0.5rem;">{{title}}</h3>
        <p style="font-size: 0.9rem; color: #4B5563;">{{text}}</p>
      </div>
      {{/services}}
    </div>
  </section>
  {{/if}}
  <!--/section-->

  <!--section:about label="Practice Background" default="on"-->
  {{#if about}}
  <section class="container">
    <!--variant:about-layout option="column"-->
    <div class="about-column">
      <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--brand-secondary, #101828); margin-bottom: 1rem;">About Our Practice</h2>
      <p style="font-size: 1rem; color: #374151; line-height: 1.7;">{{about}}</p>
    </div>
    <!--/variant-->

    <!--variant:about-layout option="sidebar"-->
    <div class="about-sidebar">
      <div>
        <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--brand-secondary, #101828); margin-bottom: 1rem;">About Our Practice</h2>
        <p style="font-size: 1rem; color: #374151; line-height: 1.7;">{{about}}</p>
      </div>
      <div style="background: var(--brand-tint, #FAFAFA); padding: 1.5rem; border-radius: var(--radius, 8px);">
        <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--brand-secondary, #101828);">Direct Appointments</h4>
        {{#if phone}}<p style="font-size: 0.85rem; color: #4B5563; margin-bottom: 0.25rem;">{{phone}}</p>{{/if}}
        {{#if email}}<p style="font-size: 0.85rem; color: #4B5563;">{{email}}</p>{{/if}}
      </div>
    </div>
    <!--/variant-->
  </section>
  {{/if}}
  <!--/section-->

  <!--section:testimonials label="Patient Reviews" default="on"-->
  {{#if testimonials}}
  <section class="container">
    <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--brand-secondary, #101828); margin-bottom: 1.5rem;">Patient Experiences</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
      {{#testimonials}}
      <div style="background: #FFFFFF; padding: 1.5rem; border-radius: var(--radius, 10px); border: 1px solid #E5E7EB;">
        <p style="font-style: italic; color: #4B5563; font-size: 0.95rem; margin-bottom: 0.75rem;">&ldquo;{{quote}}&rdquo;</p>
        <p style="font-weight: 700; font-size: 0.85rem; color: var(--brand-secondary, #101828);">{{author}} {{#if role}}&bull; {{role}}{{/if}}</p>
      </div>
      {{/testimonials}}
    </div>
  </section>
  {{/if}}
  <!--/section-->

  <!--section:contact label="Opening Times & Contact" default="on"-->
  <section class="container">
    <div style="background: #FFFFFF; border-radius: var(--radius, 16px); padding: 2.5rem; border: 1px solid #E5E7EB;">
      <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--brand-secondary, #101828); margin-bottom: 1.25rem;">Practice Details & Hours</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem;">
        {{#if address}}
        <div>
          <h4 style="font-size: 0.8rem; text-transform: uppercase; color: #6B7280; font-weight: 700; margin-bottom: 0.25rem;">Clinic Address</h4>
          <p style="font-size: 0.95rem; color: #111827;">{{address}}</p>
        </div>
        {{/if}}
        {{#if opening_hours}}
        <div>
          <h4 style="font-size: 0.8rem; text-transform: uppercase; color: #6B7280; font-weight: 700; margin-bottom: 0.25rem;">Hours</h4>
          <p style="font-size: 0.95rem; color: #111827;">{{opening_hours}}</p>
        </div>
        {{/if}}
        {{#if phone}}
        <div>
          <h4 style="font-size: 0.8rem; text-transform: uppercase; color: #6B7280; font-weight: 700; margin-bottom: 0.25rem;">Phone</h4>
          <p style="font-size: 0.95rem; color: #111827;"><a href="tel:{{phone}}" style="color: var(--brand-primary, #D92D50); text-decoration: none; font-weight: 600;">{{phone}}</a></p>
        </div>
        {{/if}}
      </div>
    </div>
  </section>
  <!--/section-->

  <footer>
    <p>&copy; {{year}} {{business_name}}. All rights reserved.</p>
  </footer>
</body>
</html>`,
  },
  {
    id: 'tpl_sample_03',
    name: 'Sample: Warm Practice',
    description: 'Welcoming aesthetic with rounded soft cards, warm neutral styling, and clear booking prompt.',
    nicheTags: ['Warm', 'Gentle', 'Private Practice', 'Welcoming'],
    sections: [
      { id: 'hero', label: 'Welcome Hero', defaultOn: true },
      { id: 'about', label: 'Our Philosophy', defaultOn: true },
      { id: 'services', label: 'Treatment Areas', defaultOn: true },
      { id: 'testimonials', label: 'What Patients Say', defaultOn: true },
      { id: 'contact', label: 'Visit & Connect', defaultOn: true },
    ],
    variants: [
      { group: 'hero-tone', options: ['tinted', 'white'] },
      { group: 'layout-density', options: ['spacious', 'compact'] },
    ],
    version: 1,
    archivedAt: null,
    isDemo: true,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{business_name}}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-body, system-ui, sans-serif);
      color: #2D3748;
      background: #FCFCFD;
      line-height: 1.65;
    }
    header {
      padding: calc(var(--space-unit, 8px) * 2) calc(var(--space-unit, 8px) * 4);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #FFFFFF;
      border-bottom: 1px solid #EDF2F7;
    }
    .container {
      max-width: 960px;
      margin: 0 auto;
      padding: calc(var(--space-unit, 8px) * 4) calc(var(--space-unit, 8px) * 3);
    }
    .btn-pill {
      background: var(--brand-primary, #D92D50);
      color: var(--brand-primary-contrast, #FFFFFF);
      padding: calc(var(--space-unit, 8px) * 1.5) calc(var(--space-unit, 8px) * 3.5);
      border-radius: var(--radius, 9999px);
      text-decoration: none;
      font-weight: 600;
      display: inline-block;
      transition: transform 0.15s ease;
    }
    .btn-pill:hover { transform: translateY(-1px); }

    /* Hero Variants */
    .hero-tinted { background: var(--brand-tint, #FFF5F5); border-radius: var(--radius, 24px); padding: 3.5rem 2.5rem; text-align: center; }
    .hero-white { background: #FFFFFF; border: 1px solid #EDF2F7; border-radius: var(--radius, 24px); padding: 3.5rem 2.5rem; text-align: center; }

    .service-bubble { background: #FFFFFF; border-radius: var(--radius, 16px); padding: 1.75rem; border: 1px solid #EDF2F7; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
    footer { padding: 3rem; text-align: center; font-size: 0.85rem; color: #718096; }
  </style>
</head>
<body>
  <header>
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      {{#if logo}}{{logo}}{{/if}}
      <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--brand-secondary, #101828);">{{business_name}}</h2>
    </div>
    {{#if cta_text}}<a href="{{cta_link}}" class="btn-pill">{{cta_text}}</a>{{/if}}
  </header>

  <!--section:hero label="Welcome Hero" default="on"-->
  <section class="container">
    <!--variant:hero-tone option="tinted"-->
    <div class="hero-tinted">
      <h1 style="font-size: 2.6rem; font-weight: 800; color: var(--brand-secondary, #101828); margin-bottom: 1.25rem; line-height: 1.2;">{{business_name}}</h1>
      {{#if tagline}}<p style="font-size: 1.15rem; color: #4A5568; max-width: 650px; margin: 0 auto 2rem;">{{tagline}}</p>{{/if}}
      {{#if cta_text}}<a href="{{cta_link}}" class="btn-pill">{{cta_text}}</a>{{/if}}
    </div>
    <!--/variant-->

    <!--variant:hero-tone option="white"-->
    <div class="hero-white">
      <h1 style="font-size: 2.6rem; font-weight: 800; color: var(--brand-secondary, #101828); margin-bottom: 1.25rem; line-height: 1.2;">{{business_name}}</h1>
      {{#if tagline}}<p style="font-size: 1.15rem; color: #4A5568; max-width: 650px; margin: 0 auto 2rem;">{{tagline}}</p>{{/if}}
      {{#if cta_text}}<a href="{{cta_link}}" class="btn-pill">{{cta_text}}</a>{{/if}}
    </div>
    <!--/variant-->
  </section>
  <!--/section-->

  <!--section:about label="Our Philosophy" default="on"-->
  {{#if about}}
  <section class="container">
    <div style="background: #FFFFFF; border: 1px solid #EDF2F7; border-radius: var(--radius, 20px); padding: 2.5rem;">
      <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--brand-secondary, #101828); margin-bottom: 1rem;">A Welcoming Environment</h2>
      <p style="font-size: 1.05rem; color: #4A5568; line-height: 1.8;">{{about}}</p>
    </div>
  </section>
  {{/if}}
  <!--/section-->

  <!--section:services label="Treatment Areas" default="on"-->
  {{#if services}}
  <section class="container">
    <h2 style="font-size: 1.6rem; font-weight: 700; color: var(--brand-secondary, #101828); margin-bottom: 1.5rem;">Treatment & Services</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem;">
      {{#services}}
      <div class="service-bubble">
        <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--brand-primary, #D92D50); margin-bottom: 0.5rem;">{{title}}</h3>
        <p style="font-size: 0.9rem; color: #718096;">{{text}}</p>
      </div>
      {{/services}}
    </div>
  </section>
  {{/if}}
  <!--/section-->

  <!--section:testimonials label="What Patients Say" default="on"-->
  {{#if testimonials}}
  <section class="container">
    <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--brand-secondary, #101828); margin-bottom: 1.5rem;">Patient Comments</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem;">
      {{#testimonials}}
      <div style="background: #FFFFFF; padding: 1.5rem; border-radius: var(--radius, 16px); border: 1px solid #EDF2F7;">
        <p style="font-style: italic; color: #4A5568; margin-bottom: 0.5rem;">&ldquo;{{quote}}&rdquo;</p>
        <p style="font-size: 0.85rem; font-weight: 600; color: var(--brand-secondary, #101828);">{{author}}</p>
      </div>
      {{/testimonials}}
    </div>
  </section>
  {{/if}}
  <!--/section-->

  <!--section:contact label="Visit & Connect" default="on"-->
  <section class="container">
    <div style="background: var(--brand-tint, #FFF5F5); border-radius: var(--radius, 20px); padding: 2.5rem; text-align: center;">
      <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--brand-secondary, #101828); margin-bottom: 1rem;">Visit Us</h2>
      {{#if address}}<p style="font-size: 1rem; color: #4A5568; margin-bottom: 0.5rem;">{{address}}</p>{{/if}}
      {{#if opening_hours}}<p style="font-size: 0.95rem; color: #718096; margin-bottom: 1.5rem;">{{opening_hours}}</p>{{/if}}
      <div style="display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap;">
        {{#if phone}}<a href="tel:{{phone}}" style="color: var(--brand-primary, #D92D50); font-weight: 600; text-decoration: none;">Tel: {{phone}}</a>{{/if}}
        {{#if email}}<a href="mailto:{{email}}" style="color: var(--brand-primary, #D92D50); font-weight: 600; text-decoration: none;">Email: {{email}}</a>{{/if}}
      </div>
    </div>
  </section>
  <!--/section-->

  <footer>
    <p>&copy; {{year}} {{business_name}}.</p>
  </footer>
</body>
</html>`,
  },
];
