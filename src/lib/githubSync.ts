import { TemplateSource, WebsiteTemplate, ReactTemplateManifest } from '../types/index.ts';
import { allowedFetch } from './allowedHosts.ts';
import { validateTemplateHtml } from './templateEngine.ts';
import { validateReactTemplateManifest } from './reactTemplateManifest.ts';

// Allowed regex for GitHub owner and repository names
const GITHUB_NAME_REGEX = /^[A-Za-z0-9_.-]{1,100}$/;

export interface ParseRepoResult {
  valid: boolean;
  owner?: string;
  repo?: string;
  branch?: string;
  folder?: string;
  error?: string;
}

/**
 * Parses user input into a validated GitHub source configuration.
 * Accepts "owner/repo" or "https://github.com/owner/repo" (and variants).
 * Strictly validates characters and rejects ".." or leading "/" in branch and folder.
 */
export function parseGitHubRepoInput(
  repoInput: string,
  branchInput = 'main',
  folderInput = ''
): ParseRepoResult {
  if (!repoInput || !repoInput.trim()) {
    return { valid: false, error: 'Repository name or URL is required.' };
  }

  let cleaned = repoInput.trim();

  // Strip protocol and domain if full URL was provided
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  cleaned = cleaned.replace(/^github\.com\//i, '');
  // Strip trailing .git and trailing slashes
  cleaned = cleaned.replace(/\.git$/i, '');
  cleaned = cleaned.replace(/\/+$/, '');

  const segments = cleaned.split('/');
  if (segments.length !== 2) {
    return {
      valid: false,
      error: 'Invalid repository format. Please enter "owner/repo" or a valid github.com URL.',
    };
  }

  const [owner, repo] = segments;

  if (!GITHUB_NAME_REGEX.test(owner)) {
    return {
      valid: false,
      error: 'Owner name contains invalid characters. Use letters, numbers, hyphens, periods, or underscores (up to 100 characters).',
    };
  }

  if (!GITHUB_NAME_REGEX.test(repo)) {
    return {
      valid: false,
      error: 'Repository name contains invalid characters. Use letters, numbers, hyphens, periods, or underscores (up to 100 characters).',
    };
  }

  // Validate branch: reject ".." and leading "/"
  const branch = (branchInput || 'main').trim();
  if (branch.includes('..')) {
    return { valid: false, error: 'Branch cannot contain ".." path traversal characters.' };
  }
  if (branch.startsWith('/')) {
    return { valid: false, error: 'Branch cannot start with a leading slash.' };
  }
  if (!branch) {
    return { valid: false, error: 'Branch name cannot be empty.' };
  }

  // Validate folder: reject ".." and leading "/"
  let folder = (folderInput || '').trim();
  if (folder.includes('..')) {
    return { valid: false, error: 'Folder path cannot contain ".." path traversal characters.' };
  }
  if (folder.startsWith('/')) {
    return { valid: false, error: 'Folder path cannot start with a leading slash.' };
  }
  // Strip trailing slashes
  folder = folder.replace(/\/+$/, '');

  return {
    valid: true,
    owner,
    repo,
    branch,
    folder,
  };
}

export interface GitHubRepoDetails {
  owner: string;
  repo: string;
  defaultBranch: string;
  description?: string;
  isPrivate?: boolean;
}

/**
 * Fetches GitHub repository details via GET /repos/{owner}/{repo}.
 * Detects default_branch and verifies repository is public and accessible.
 * Provides exact error messages for 404, rate limits (with reset time), and private repos.
 */
export async function fetchGitHubRepoDetails(
  owner: string,
  repo: string
): Promise<GitHubRepoDetails> {
  const repoUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  let response: Response;
  try {
    response = await allowedFetch(
      repoUrl,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'OpenHoursConsole/1.0',
        },
      },
      'github'
    );
  } catch (err: any) {
    throw new Error(`Network error connecting to GitHub: ${err?.message || 'Unable to reach api.github.com'}`);
  }

  if (response.status === 404) {
    throw new Error(`Repository "${owner}/${repo}" was not found or is not public.`);
  }

  if (response.status === 403) {
    const rateRemaining = response.headers.get('x-ratelimit-remaining');
    const rateReset = response.headers.get('x-ratelimit-reset');
    const resetTime = rateReset ? new Date(parseInt(rateReset, 10) * 1000).toLocaleTimeString() : undefined;
    const responseText = await response.text();
    if (rateRemaining === '0' || responseText.toLowerCase().includes('rate limit')) {
      const resetMsg = resetTime ? ` Rate limit resets at ${resetTime}.` : '';
      throw new Error(
        `GitHub API rate limit exceeded (60 requests/hour unauthenticated).${resetMsg} Please wait before connecting.`
      );
    }
    throw new Error(`Repository "${owner}/${repo}" access forbidden or repository is private.`);
  }

  if (!response.ok) {
    throw new Error(`GitHub API error (${response.status}): ${response.statusText}`);
  }

  const data = await response.json();
  if (data.private) {
    throw new Error(`Repository "${owner}/${repo}" is private. Only public repositories are supported.`);
  }

  return {
    owner: data.owner?.login || owner,
    repo: data.name || repo,
    defaultBranch: data.default_branch || 'main',
    description: data.description,
    isPrivate: !!data.private,
  };
}

/**
 * Extracts optional metadata comment from HTML.
 * Format: <!--meta name="Title" tags="tag1,tag2" description="Description"-->
 */
export function parseTemplateCommentMeta(html: string): {
  name?: string;
  tags?: string[];
  description?: string;
} {
  const commentMatch = html.match(/<!--\s*meta\s+([^>]+?)-->/i);
  if (!commentMatch) return {};

  const attrsString = commentMatch[1];
  const result: { name?: string; tags?: string[]; description?: string } = {};

  const nameMatch = attrsString.match(/\bname\s*=\s*["']([^"']+)["']/i);
  if (nameMatch && nameMatch[1].trim()) {
    result.name = nameMatch[1].trim();
  }

  const tagsMatch = attrsString.match(/\btags\s*=\s*["']([^"']+)["']/i);
  if (tagsMatch && tagsMatch[1].trim()) {
    result.tags = tagsMatch[1]
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  const descMatch = attrsString.match(/\bdescription\s*=\s*["']([^"']+)["']/i);
  if (descMatch && descMatch[1].trim()) {
    result.description = descMatch[1].trim();
  }

  return result;
}

/**
 * Parses optional sidecar JSON metadata.
 */
export function parseSidecarJson(jsonStr: string): {
  name?: string;
  tags?: string[];
  description?: string;
} | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') return null;

    const result: { name?: string; tags?: string[]; description?: string } = {};
    if (typeof parsed.name === 'string' && parsed.name.trim()) {
      result.name = parsed.name.trim();
    }
    if (typeof parsed.description === 'string' && parsed.description.trim()) {
      result.description = parsed.description.trim();
    }
    if (Array.isArray(parsed.nicheTags)) {
      result.tags = parsed.nicheTags
        .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
        .map((t: string) => t.trim());
    } else if (Array.isArray(parsed.tags)) {
      result.tags = parsed.tags
        .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
        .map((t: string) => t.trim());
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * Converts a file path into a clean human-readable name.
 * e.g. "templates/modern-clinical.html" -> "Modern Clinical"
 */
export function humanizeFileName(filePath: string): string {
  const fileName = filePath.split('/').pop() || filePath;
  const base = fileName.replace(/\.html?$/i, '');
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Validates PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
 */
export function isValidPngBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 8) return false;
  return (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

export type TemplateScanStatus =
  | 'New'
  | 'Update available'
  | 'Unchanged'
  | 'Missing in repo'
  | 'Invalid';

export interface ScannedTemplateItem {
  path: string;
  fileName: string;
  name: string;
  description: string;
  nicheTags: string[];
  sizeBytes: number;
  status: TemplateScanStatus;
  validatorReason?: string;
  blobSha?: string;
  commitSha?: string;
  html?: string;
  thumbnailDataUrl?: string;
  existingTemplateId?: string;
  existingVersion?: number;
  templateType?: 'html' | 'react';
  manifest?: ReactTemplateManifest;
  previewUrl?: string;
  previewHost?: string;
  requiresDomainConfirmation?: boolean;
}

export interface ScanDiagnostics {
  branch: string;
  folder: string;
  totalTreeFiles: number;
  hasPackageJson: boolean;
  hasOhTemplateJson: boolean;
  ohTemplateJsonPath?: string;
  hint: string;
}

export interface GitHubScanResult {
  headSha: string;
  scannedAt: string;
  items: ScannedTemplateItem[];
  totalFound: number;
  validCount: number;
  diagnostics?: ScanDiagnostics;
  error?: string;
}

/**
 * Scans a GitHub repository for templates:
 * 1. Makes ONE call to api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1
 * 2. Filters *.html files under the specified folder (max 100 files)
 * 3. Fetches raw files from raw.githubusercontent.com PINNED to the commit/tree SHA (batches of 10, max 300 KB each)
 * 4. Checks sidecar .json or comment metadata and optional .png thumbnails (max 200 KB)
 * 5. Validates HTML with strict template rules (no script, event handlers, external links, etc.)
 * 6. Classifies as New, Update available, Unchanged, Missing in repo, or Invalid.
 */
export async function scanGitHubTemplateSource(
  source: TemplateSource,
  existingTemplates: WebsiteTemplate[]
): Promise<GitHubScanResult> {
  const treeUrl = `https://api.github.com/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/git/trees/${encodeURIComponent(source.branch)}?recursive=1`;

  let response: Response;
  try {
    response = await allowedFetch(treeUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'OpenHoursConsole/1.0',
      },
    }, 'github');
  } catch (err: any) {
    throw new Error(`Network error connecting to GitHub: ${err?.message || 'Unable to reach api.github.com'}`);
  }

  // Handle Rate Limiting & Not Found
  if (response.status === 404) {
    throw new Error('Repository not found or not public');
  }

  if (response.status === 403) {
    const rateRemaining = response.headers.get('x-ratelimit-remaining');
    const rateReset = response.headers.get('x-ratelimit-reset');
    const resetTime = rateReset ? new Date(parseInt(rateReset, 10) * 1000).toLocaleTimeString() : undefined;
    const responseText = await response.text();
    if (rateRemaining === '0' || responseText.toLowerCase().includes('rate limit')) {
      const resetMsg = resetTime ? ` Rate limit resets at ${resetTime}.` : '';
      throw new Error(
        `GitHub API rate limit exceeded (60 requests/hour unauthenticated).${resetMsg} Please wait before scanning again.`
      );
    }
    throw new Error('Repository not found or not public');
  }

  if (!response.ok) {
    throw new Error(`GitHub API error (${response.status}): ${response.statusText}`);
  }

  const treeData = await response.json();
  const headSha = treeData.sha || 'HEAD';
  const treeEntries: Array<{
    path: string;
    mode: string;
    type: string;
    sha: string;
    size?: number;
  }> = Array.isArray(treeData.tree) ? treeData.tree : [];

  // Normalize folder prefix (empty means repo root)
  const cleanFolder = (source.folder || '').trim().replace(/^\/+|\/+$/g, '');
  const prefix = cleanFolder.length > 0 ? `${cleanFolder}/` : '';

  // Filter HTML files under folder (if prefix provided; otherwise all HTML in repo)
  let htmlEntries = treeEntries.filter((entry) => {
    if (entry.type !== 'blob') return false;
    const lowerPath = entry.path.toLowerCase();
    if (!lowerPath.endsWith('.html') && !lowerPath.endsWith('.htm')) return false;
    if (prefix) {
      return entry.path.startsWith(prefix);
    }
    return true;
  });

  // Limit to max 100 files
  if (htmlEntries.length > 100) {
    htmlEntries = htmlEntries.slice(0, 100);
  }

  // Track templates currently imported from this source
  const sourceTemplates = existingTemplates.filter(
    (t) => !t.archivedAt && t.source?.sourceId === source.id
  );

  const scannedItems: ScannedTemplateItem[] = [];

  // Batch process HTML files in chunks of 10 to respect concurrency limits
  const CHUNK_SIZE = 10;
  for (let i = 0; i < htmlEntries.length; i += CHUNK_SIZE) {
    const chunk = htmlEntries.slice(i, i + CHUNK_SIZE);

    const chunkResults = await Promise.all(
      chunk.map(async (entry) => {
        const fileName = entry.path.split('/').pop() || entry.path;
        const sizeBytes = entry.size || 0;
        const basePath = entry.path.replace(/\.html?$/i, '');

        // 1. Initial size check
        if (sizeBytes > 300 * 1024) {
          return {
            path: entry.path,
            fileName,
            name: humanizeFileName(entry.path),
            description: '',
            nicheTags: [],
            sizeBytes,
            status: 'Invalid' as TemplateScanStatus,
            validatorReason: `File exceeds 300 KB size limit (${(sizeBytes / 1024).toFixed(1)} KB).`,
            blobSha: entry.sha,
            commitSha: headSha,
          };
        }

        // 2. Fetch raw HTML content pinned to headSha
        const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/${headSha}/${entry.path}`;

        let html = '';
        try {
          const rawRes = await allowedFetch(rawUrl, {}, 'github');
          if (!rawRes.ok) {
            return {
              path: entry.path,
              fileName,
              name: humanizeFileName(entry.path),
              description: '',
              nicheTags: [],
              sizeBytes,
              status: 'Invalid' as TemplateScanStatus,
              validatorReason: `Failed to fetch file from raw.githubusercontent.com (HTTP ${rawRes.status}).`,
              blobSha: entry.sha,
              commitSha: headSha,
            };
          }

          html = await rawRes.text();
        } catch (fetchErr: any) {
          return {
            path: entry.path,
            fileName,
            name: humanizeFileName(entry.path),
            description: '',
            nicheTags: [],
            sizeBytes,
            status: 'Invalid' as TemplateScanStatus,
            validatorReason: `Fetch error: ${fetchErr?.message || 'Network failure'}`,
            blobSha: entry.sha,
            commitSha: headSha,
          };
        }

        // Check fetched size
        const fetchedBytes = new Blob([html]).size;
        if (fetchedBytes > 300 * 1024) {
          return {
            path: entry.path,
            fileName,
            name: humanizeFileName(entry.path),
            description: '',
            nicheTags: [],
            sizeBytes: fetchedBytes,
            status: 'Invalid' as TemplateScanStatus,
            validatorReason: `File exceeds 300 KB size limit (${(fetchedBytes / 1024).toFixed(1)} KB).`,
            blobSha: entry.sha,
            commitSha: headSha,
          };
        }

        // 3. Security & template validation
        const validation = validateTemplateHtml(html);
        if (!validation.valid) {
          return {
            path: entry.path,
            fileName,
            name: humanizeFileName(entry.path),
            description: '',
            nicheTags: [],
            sizeBytes: fetchedBytes,
            status: 'Invalid' as TemplateScanStatus,
            validatorReason: validation.errors.join('; '),
            blobSha: entry.sha,
            commitSha: headSha,
          };
        }

        // 4. Metadata resolution: Sidecar JSON -> HTML comment -> humanized filename
        let templateName = humanizeFileName(entry.path);
        let templateDescription = '';
        let templateTags: string[] = [];

        // Check for sidecar JSON
        const jsonEntry = treeEntries.find(
          (t) => t.type === 'blob' && t.path.toLowerCase() === `${basePath.toLowerCase()}.json`
        );
        if (jsonEntry && (jsonEntry.size || 0) <= 50 * 1024) {
          try {
            const jsonUrl = `https://raw.githubusercontent.com/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/${headSha}/${jsonEntry.path}`;
            const jsonRes = await allowedFetch(jsonUrl, {}, 'github');
            if (jsonRes.ok) {
              const jsonText = await jsonRes.text();
              const parsedMeta = parseSidecarJson(jsonText);
              if (parsedMeta) {
                if (parsedMeta.name) templateName = parsedMeta.name;
                if (parsedMeta.description) templateDescription = parsedMeta.description;
                if (parsedMeta.tags && parsedMeta.tags.length > 0) templateTags = parsedMeta.tags;
              }
            }
          } catch {
            // Non-fatal fallback
          }
        }

        // Check for HTML comment metadata if still missing
        const commentMeta = parseTemplateCommentMeta(html);
        if (commentMeta.name && templateName === humanizeFileName(entry.path)) {
          templateName = commentMeta.name;
        }
        if (commentMeta.description && !templateDescription) {
          templateDescription = commentMeta.description;
        }
        if (commentMeta.tags && templateTags.length === 0) {
          templateTags = commentMeta.tags;
        }

        // 5. Optional PNG thumbnail (max 200 KB)
        let thumbnailDataUrl: string | undefined;
        const pngEntry = treeEntries.find(
          (t) => t.type === 'blob' && t.path.toLowerCase() === `${basePath.toLowerCase()}.png`
        );
        if (pngEntry && (pngEntry.size || 0) <= 200 * 1024) {
          try {
            const pngUrl = `https://raw.githubusercontent.com/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/${headSha}/${pngEntry.path}`;
            const pngRes = await allowedFetch(pngUrl, {}, 'github');
            if (pngRes.ok) {
              const buffer = await pngRes.arrayBuffer();
              const bytes = new Uint8Array(buffer);
              if (bytes.length <= 200 * 1024 && isValidPngBytes(bytes)) {
                // Convert to base64 data URL
                let binary = '';
                const len = bytes.byteLength;
                for (let b = 0; b < len; b++) {
                  binary += String.fromCharCode(bytes[b]);
                }
                const b64 = btoa(binary);
                thumbnailDataUrl = `data:image/png;base64,${b64}`;
              }
            }
          } catch {
            // Ignore thumbnail failures
          }
        }

        // 6. Determine status: New, Update available, or Unchanged
        const existing = sourceTemplates.find((t) => t.source?.path === entry.path);
        let status: TemplateScanStatus = 'New';
        if (existing) {
          if (existing.source?.blobSha === entry.sha) {
            status = 'Unchanged';
          } else {
            status = 'Update available';
          }
        }

        return {
          path: entry.path,
          fileName,
          name: templateName,
          description: templateDescription,
          nicheTags: templateTags,
          sizeBytes: fetchedBytes,
          status,
          blobSha: entry.sha,
          commitSha: headSha,
          html,
          thumbnailDataUrl,
          existingTemplateId: existing?.id,
          existingVersion: existing?.version,
        };
      })
    );

    scannedItems.push(...chunkResults);
  }

  // Scan for oh-template.json at repo root OR in folder prefix
  const manifestCandidates = treeEntries.filter((entry) => {
    if (entry.type !== 'blob') return false;
    const p = entry.path.toLowerCase();
    return p === 'oh-template.json' || (prefix && p === `${prefix.toLowerCase()}oh-template.json`);
  });

  for (const entry of manifestCandidates) {
    const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/${headSha}/${entry.path}`;
    try {
      const res = await allowedFetch(rawUrl, {}, 'github');
      if (!res.ok) {
        scannedItems.push({
          path: entry.path,
          fileName: entry.path.split('/').pop() || 'oh-template.json',
          name: 'React template: Invalid manifest',
          description: '',
          nicheTags: ['React'],
          sizeBytes: 0,
          status: 'Invalid',
          validatorReason: `Failed to fetch oh-template.json (HTTP ${res.status})`,
          blobSha: entry.sha,
          commitSha: headSha,
          templateType: 'react',
        });
        continue;
      }
      const rawText = await res.text();
      const fetchedBytes = new Blob([rawText]).size;
      let parsed: any;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        scannedItems.push({
          path: entry.path,
          fileName: entry.path.split('/').pop() || 'oh-template.json',
          name: 'React template: Invalid manifest',
          description: '',
          nicheTags: ['React'],
          sizeBytes: fetchedBytes,
          status: 'Invalid',
          validatorReason: 'Invalid JSON format in oh-template.json.',
          blobSha: entry.sha,
          commitSha: headSha,
          templateType: 'react',
        });
        continue;
      }

      const validation = validateReactTemplateManifest(parsed);
      if (!validation.valid || !validation.manifest) {
        scannedItems.push({
          path: entry.path,
          fileName: entry.path.split('/').pop() || 'oh-template.json',
          name: 'React template: Invalid manifest',
          description: '',
          nicheTags: ['React'],
          sizeBytes: fetchedBytes,
          status: 'Invalid',
          validatorReason: validation.errors.join('; '),
          blobSha: entry.sha,
          commitSha: headSha,
          templateType: 'react',
          previewHost: validation.previewHost,
          requiresDomainConfirmation: validation.requiresDomainConfirmation,
        });
        continue;
      }

      const existing = sourceTemplates.find((t) => t.source?.path === entry.path);
      let status: TemplateScanStatus = 'New';
      if (existing) {
        if (existing.source?.blobSha === entry.sha) {
          status = 'Unchanged';
        } else {
          status = 'Update available';
        }
      }

      scannedItems.push({
        path: entry.path,
        fileName: entry.path.split('/').pop() || 'oh-template.json',
        name: `React template: ${validation.manifest.name}`,
        description: validation.manifest.description || '',
        nicheTags: validation.manifest.tags || ['React', 'Config-driven'],
        sizeBytes: fetchedBytes,
        status,
        blobSha: entry.sha,
        commitSha: headSha,
        html: '',
        templateType: 'react',
        manifest: validation.manifest,
        previewUrl: validation.manifest.previewUrl,
        previewHost: validation.previewHost,
        requiresDomainConfirmation: validation.requiresDomainConfirmation,
        existingTemplateId: existing?.id,
        existingVersion: existing?.version,
      });
    } catch (err: any) {
      scannedItems.push({
        path: entry.path,
        fileName: entry.path.split('/').pop() || 'oh-template.json',
        name: 'React template: Invalid manifest',
        description: '',
        nicheTags: ['React'],
        sizeBytes: 0,
        status: 'Invalid',
        validatorReason: err?.message || 'Error fetching oh-template.json',
        blobSha: entry.sha,
        commitSha: headSha,
        templateType: 'react',
      });
    }
  }

  // 7. Check for "Missing in repo" templates
  const repoPaths = new Set([
    ...htmlEntries.map((e) => e.path),
    ...manifestCandidates.map((e) => e.path),
  ]);
  for (const existing of sourceTemplates) {
    if (existing.source?.path && !repoPaths.has(existing.source.path)) {
      scannedItems.push({
        path: existing.source.path,
        fileName: existing.source.path.split('/').pop() || existing.source.path,
        name: existing.name,
        description: existing.description,
        nicheTags: existing.nicheTags,
        sizeBytes: 0,
        status: 'Missing in repo',
        validatorReason: 'Template file is no longer present in current repo branch.',
        existingTemplateId: existing.id,
        existingVersion: existing.version,
        blobSha: existing.source.blobSha,
        commitSha: existing.source.commitSha,
      });
    }
  }

  const validCount = scannedItems.filter(
    (item) => item.status === 'New' || item.status === 'Update available' || item.status === 'Unchanged'
  ).length;

  // Calculate diagnostic details
  const totalTreeFiles = treeEntries.filter((e) => e.type === 'blob').length;
  const hasPackageJson = treeEntries.some((e) => e.path.toLowerCase() === 'package.json');
  const ohTemplateEntry = treeEntries.find((e) => e.path.toLowerCase().endsWith('oh-template.json'));
  const hasOhTemplateJson = !!ohTemplateEntry;
  const ohTemplateJsonPath = ohTemplateEntry?.path;

  let hint = '';
  if (!hasOhTemplateJson && !hasPackageJson) {
    hint = 'This repository has no oh-template.json or package.json. Run the config-driven conversion prompt in AI Studio first or connect a repository containing templates.';
  } else if (!hasOhTemplateJson && hasPackageJson) {
    hint = 'This repository has no oh-template.json. Run the config-driven conversion prompt in AI Studio first.';
  } else if (hasOhTemplateJson && manifestCandidates.length === 0) {
    hint = `Found oh-template.json at "${ohTemplateJsonPath}", but the scan folder was set to "${cleanFolder}". Clear the folder field or update it to match the manifest location.`;
  } else if (cleanFolder && htmlEntries.length === 0 && manifestCandidates.length === 0) {
    hint = `No templates found under folder "${cleanFolder}". Check that HTML templates exist in this folder, or leave the folder field empty for React templates (manifest at repo root).`;
  } else if (scannedItems.length === 0) {
    hint = `No templates matched in branch "${source.branch}". Verify your folder setting or add oh-template.json at the repository root.`;
  }

  const diagnostics: ScanDiagnostics = {
    branch: source.branch,
    folder: cleanFolder,
    totalTreeFiles,
    hasPackageJson,
    hasOhTemplateJson,
    ohTemplateJsonPath,
    hint,
  };

  return {
    headSha,
    scannedAt: new Date().toISOString(),
    items: scannedItems,
    totalFound: scannedItems.length,
    validCount,
    diagnostics,
  };
}
