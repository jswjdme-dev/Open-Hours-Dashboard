import { createStoredZip, ZipFileInput } from './zipWriter.ts';

export interface ReactConfigPackOptions {
  projectTitle: string;
  templateName: string;
  config: Record<string, any>;
  includePublicContactDetails: boolean;
}

/**
 * Extracts binary bytes and file extension from a base64 Data URL.
 */
function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; extension: string } | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length !== 2) return null;
    const header = parts[0];
    const base64Data = parts[1];

    let extension = 'png';
    if (header.includes('image/jpeg') || header.includes('image/jpg')) extension = 'jpg';
    else if (header.includes('image/webp')) extension = 'webp';
    else if (header.includes('image/svg+xml')) extension = 'svg';

    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return { bytes, extension };
  } catch {
    return null;
  }
}

/**
 * Recursively scans config to extract image Data URLs into discrete asset files,
 * replacing the data URL in config with relative paths ("./assets/filename").
 */
function extractAssetsFromConfig(
  obj: any,
  assetList: ZipFileInput[],
  assetCounter = { count: 0 }
): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    if (obj.startsWith('data:image/')) {
      const extracted = dataUrlToBytes(obj);
      if (extracted) {
        assetCounter.count++;
        const filename = `assets/asset_${assetCounter.count}.${extracted.extension}`;
        assetList.push({
          name: filename,
          content: extracted.bytes,
        });
        return `./${filename}`;
      }
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => extractAssetsFromConfig(item, assetList, assetCounter));
  }

  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = extractAssetsFromConfig(v, assetList, assetCounter);
    }
    return result;
  }

  return obj;
}

/**
 * Recursively masks sensitive contact details with placeholders unless explicitly enabled.
 */
function sanitizeContactDetails(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeContactDetails(item));
  }

  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      const lowerKey = k.toLowerCase();
      if (lowerKey === 'phone' || lowerKey.endsWith('.phone')) {
        result[k] = '+353 1 234 5678';
      } else if (lowerKey === 'email' || lowerKey.endsWith('.email')) {
        result[k] = 'info@example.com';
      } else if (lowerKey === 'address' || lowerKey.endsWith('.address')) {
        result[k] = 'Dublin, Ireland';
      } else {
        result[k] = sanitizeContactDetails(v);
      }
    }
    return result;
  }

  return obj;
}

/**
 * Generates the complete "Download config pack (.zip)" for React config-driven projects.
 */
export function generateReactConfigPack(options: ReactConfigPackOptions): {
  zipBytes: Uint8Array;
  filename: string;
  sanitizedConfig: Record<string, any>;
} {
  const assetFiles: ZipFileInput[] = [];

  // 1. Sanitize contact details if checkbox is OFF (default)
  let workingConfig = options.includePublicContactDetails
    ? JSON.parse(JSON.stringify(options.config))
    : sanitizeContactDetails(options.config);

  // 2. Extract Data URL images into /assets files and link relatively
  workingConfig = extractAssetsFromConfig(workingConfig, assetFiles);

  const configJson = JSON.stringify(workingConfig, null, 2);

  // 3. Build README.md
  const readmeContent = `# ${options.projectTitle} - React Website Configuration Pack
Generated: ${new Date().toISOString()}
Template: ${options.templateName}

## Deployment Steps:
1. Copy \`site.config.json\` directly into your React template repository's \`public/\` folder.
2. Copy any files from the \`assets/\` folder into \`public/assets/\`.
3. Commit and push changes or deploy your repository to your client hosting provider (Vercel, Netlify, Cloudflare Pages, etc.).

## Security Note:
Public contact details are ${
    options.includePublicContactDetails
      ? 'included as configured in Website Studio.'
      : 'masked with generic placeholders. Update site.config.json if deploying production credentials.'
  }
`;

  // 4. Build PROMPT.md for Google AI Studio
  const promptContent = `# AI Studio React Website Brief: ${options.projectTitle}
Template: ${options.templateName}
Exported: ${new Date().toISOString()}

## Configuration Structure
This project is config-driven. The full component configuration is defined in \`site.config.json\`.

## Engineering Guidelines
After each set of changes, commit with a message that starts with 'v<number>:' followed by a short plain-language summary. Do not add tracking, analytics or external services. Do not invent testimonials, reviews, statistics or prices.
`;

  const zipFiles: ZipFileInput[] = [
    { name: 'site.config.json', content: configJson },
    { name: 'README.md', content: readmeContent },
    { name: 'PROMPT.md', content: promptContent },
    ...assetFiles,
  ];

  const zipBytes = createStoredZip(zipFiles);
  const safeSlug = options.projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'react-site';
  const filename = `${safeSlug}-config-pack.zip`;

  return {
    zipBytes,
    filename,
    sanitizedConfig: workingConfig,
  };
}
