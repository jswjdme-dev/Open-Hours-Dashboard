import {
  ManifestField,
  ManifestFieldType,
  ManifestListField,
  ReactTemplateManifest,
  WebsiteTemplateSection,
  WebsiteTemplateVariantGroup,
} from '../types/index.ts';
import { validatePreviewUrl } from './customWebsiteValidation.ts';

export const ALLOWED_FIELD_TYPES: readonly ManifestFieldType[] = [
  'text',
  'textarea',
  'number',
  'color',
  'select',
  'boolean',
  'image',
  'list',
] as const;

export const MAX_FIELDS_LIMIT = 60;
export const MAX_PAYLOAD_BYTES = 6 * 1024 * 1024; // 6 MB
export const HANDSHAKE_TIMEOUT_MS = 8000;
export const HANDSHAKE_TIMEOUT_MESSAGE =
  'No response: the template did not answer. Check the preview URL and that the template includes the OH message listener.';

export interface ManifestValidationOptions {
  confirmedExternalDomain?: boolean;
}

export interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
  manifest?: ReactTemplateManifest;
  requiresDomainConfirmation?: boolean;
  previewHost?: string;
}

/**
 * Validates a React template manifest (oh-template.json) strictly according to schema:
 * - schemaVersion: 1
 * - Field types from allowed list
 * - Max 60 fields total
 * - Max string lengths
 * - previewUrl https only
 * - Lists exact failing fields for all validation errors
 */
export function validateReactTemplateManifest(
  data: unknown,
  options?: ManifestValidationOptions
): ManifestValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, errors: ['Manifest must be a valid JSON object.'] };
  }

  const raw = data as Record<string, any>;

  // 1. schemaVersion
  if (raw.schemaVersion !== 1) {
    errors.push('Field "schemaVersion": schemaVersion must be exactly 1.');
  }

  // 2. name
  if (typeof raw.name !== 'string' || !raw.name.trim()) {
    errors.push('Field "name": Template name is required.');
  } else if (raw.name.trim().length > 100) {
    errors.push('Field "name": Template name cannot exceed 100 characters.');
  }

  // 3. description
  if (raw.description !== undefined) {
    if (typeof raw.description !== 'string') {
      errors.push('Field "description": Template description must be a string.');
    } else if (raw.description.length > 500) {
      errors.push('Field "description": Template description cannot exceed 500 characters.');
    }
  }

  // 4. previewUrl
  let previewHost: string | undefined = undefined;
  let requiresDomainConfirmation = false;
  if (!raw.previewUrl || typeof raw.previewUrl !== 'string') {
    errors.push('Field "previewUrl": previewUrl is required (must start with https://).');
  } else {
    const urlValidation = validatePreviewUrl(raw.previewUrl);
    if (!urlValidation.valid) {
      errors.push(`Field "previewUrl": ${urlValidation.error || 'Must be a valid HTTPS URL.'}`);
    } else {
      try {
        previewHost = new URL(raw.previewUrl).hostname;
      } catch {}
      if (!urlValidation.isAllowedDomain) {
        requiresDomainConfirmation = true;
      }
    }
  }

  // 5. fields
  if (!Array.isArray(raw.fields)) {
    errors.push('Field "fields": fields must be an array.');
  }

  const fieldsList: ManifestField[] = Array.isArray(raw.fields) ? raw.fields : [];
  const listsList: ManifestListField[] = Array.isArray(raw.lists) ? raw.lists : [];

  // Count total fields (top-level fields + fields in lists)
  let totalFieldCount = fieldsList.length;
  listsList.forEach((l) => {
    if (Array.isArray(l.itemFields)) {
      totalFieldCount += l.itemFields.length;
    }
  });

  if (totalFieldCount > MAX_FIELDS_LIMIT) {
    errors.push(`Field "fields": Total field count (${totalFieldCount}) exceeds maximum limit of ${MAX_FIELDS_LIMIT}.`);
  }

  // Validate top-level fields
  fieldsList.forEach((field, idx) => {
    if (!field || typeof field !== 'object') {
      errors.push(`Field "fields[${idx}]": Field at index ${idx} is not an object.`);
      return;
    }
    const key = typeof field.key === 'string' ? field.key.trim() : '';
    if (!key) {
      errors.push(`Field "fields[${idx}].key": Field at index ${idx} is missing a key.`);
    } else if (key.length > 100) {
      errors.push(`Field "fields[${key}].key": Field key cannot exceed 100 characters.`);
    }

    const label = typeof field.label === 'string' ? field.label.trim() : '';
    if (!label) {
      errors.push(`Field "fields[${key || idx}].label": Field is missing a label.`);
    } else if (label.length > 100) {
      errors.push(`Field "fields[${key || idx}].label": Field label cannot exceed 100 characters.`);
    }

    if (!ALLOWED_FIELD_TYPES.includes(field.type)) {
      errors.push(
        `Field "fields[${key || idx}].type": Field has invalid type "${field.type}". Allowed types: ${ALLOWED_FIELD_TYPES.join(', ')}.`
      );
    }

    if (field.type === 'select') {
      if (!Array.isArray(field.options) || field.options.length === 0) {
        errors.push(`Field "fields[${key}].options": Select field must provide an options array with at least one option.`);
      } else if (field.options.length > 50) {
        errors.push(`Field "fields[${key}].options": Select field cannot have more than 50 options.`);
      }
    }
  });

  // Validate lists
  if (raw.lists !== undefined) {
    if (!Array.isArray(raw.lists)) {
      errors.push('Field "lists": lists must be an array.');
    } else if (raw.lists.length > 10) {
      errors.push('Field "lists": Cannot define more than 10 lists in a template manifest.');
    } else {
      raw.lists.forEach((lst: any, lIdx: number) => {
        if (!lst || typeof lst !== 'object') {
          errors.push(`Field "lists[${lIdx}]": List at index ${lIdx} is not an object.`);
          return;
        }
        const lKey = typeof lst.key === 'string' ? lst.key.trim() : '';
        if (!lKey) {
          errors.push(`Field "lists[${lIdx}].key": List at index ${lIdx} is missing a key.`);
        }
        const lLabel = typeof lst.label === 'string' ? lst.label.trim() : '';
        if (!lLabel) {
          errors.push(`Field "lists[${lKey || lIdx}].label": List is missing a label.`);
        }
        if (!Array.isArray(lst.itemFields) || lst.itemFields.length === 0) {
          errors.push(`Field "lists[${lKey}].itemFields": List must have a non-empty itemFields array.`);
        } else {
          lst.itemFields.forEach((subField: any, subIdx: number) => {
            const subKey = typeof subField.key === 'string' ? subField.key.trim() : '';
            if (!subKey) {
              errors.push(`Field "lists[${lKey}].itemFields[${subIdx}].key": Item field at index ${subIdx} is missing a key.`);
            }
            if (!ALLOWED_FIELD_TYPES.includes(subField.type)) {
              errors.push(
                `Field "lists[${lKey}].itemFields[${subKey || subIdx}].type": Item field has invalid type "${subField.type}". Allowed types: ${ALLOWED_FIELD_TYPES.join(', ')}.`
              );
            }
          });
        }
      });
    }
  }

  // Validate sections if present
  if (raw.sections !== undefined) {
    if (!Array.isArray(raw.sections)) {
      errors.push('Field "sections": sections must be an array.');
    } else {
      raw.sections.forEach((sec: any, sIdx: number) => {
        if (!sec || typeof sec.id !== 'string' || !sec.id.trim()) {
          errors.push(`Field "sections[${sIdx}].id": Section at index ${sIdx} is missing a valid id.`);
        }
      });
    }
  }

  // Validate variants if present
  if (raw.variants !== undefined) {
    if (!Array.isArray(raw.variants)) {
      errors.push('Field "variants": variants must be an array.');
    } else {
      raw.variants.forEach((v: any, vIdx: number) => {
        if (!v || typeof v.group !== 'string' || !v.group.trim()) {
          errors.push(`Field "variants[${vIdx}].group": Variant group at index ${vIdx} is missing a group name.`);
        }
        if (!Array.isArray(v.options)) {
          errors.push(`Field "variants[${v?.group || vIdx}].options": Variant group options must be an array.`);
        }
      });
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, requiresDomainConfirmation, previewHost };
  }

  const manifest: ReactTemplateManifest = {
    schemaVersion: 1,
    name: raw.name.trim(),
    description: raw.description ? raw.description.trim() : undefined,
    previewUrl: raw.previewUrl.trim(),
    fields: fieldsList,
    lists: listsList.length > 0 ? listsList : undefined,
    sections: Array.isArray(raw.sections) ? raw.sections : undefined,
    variants: Array.isArray(raw.variants) ? raw.variants : undefined,
    tags: Array.isArray(raw.tags) ? raw.tags : undefined,
    defaultConfig: raw.defaultConfig && typeof raw.defaultConfig === 'object' ? raw.defaultConfig : undefined,
  };

  return { valid: true, errors: [], manifest, requiresDomainConfirmation, previewHost };
}

/**
 * Calculates payload size in bytes when serialized to JSON.
 */
export function calculateConfigPayloadSize(config: Record<string, any>): number {
  try {
    const jsonStr = JSON.stringify(config);
    return new Blob([jsonStr]).size;
  } catch {
    return 0;
  }
}

/**
 * Returns true if payload is within the 6 MB postMessage limit.
 */
export function isPayloadWithinLimit(config: Record<string, any>): boolean {
  return calculateConfigPayloadSize(config) <= MAX_PAYLOAD_BYTES;
}

/**
 * Validates a postMessage handshake event from an iframe.
 * Strictly verifies that the message sender is the expected iframe window
 * and has type 'OH_READY' with version 1.
 */
export function validateHandshakeMessage(
  event: { data: any; source: any },
  expectedContentWindow: any
): boolean {
  if (!expectedContentWindow) return false;
  if (event.source !== expectedContentWindow) return false;
  if (!event.data || typeof event.data !== 'object') return false;
  return event.data.type === 'OH_READY' && event.data.version === 1;
}

/**
 * Helper to get a value from a nested or flat object using a dot-path (e.g. "details.businessName").
 */
export function getNestedValue(obj: Record<string, any> | undefined, path: string): any {
  if (!obj || !path) return undefined;
  if (obj[path] !== undefined) return obj[path];

  const segments = path.split('.');
  let curr: any = obj;
  for (const seg of segments) {
    if (curr === null || curr === undefined || typeof curr !== 'object') {
      return undefined;
    }
    curr = curr[seg];
  }
  return curr;
}

/**
 * Helper to set a value in a nested object using a dot-path.
 */
export function setNestedValue(obj: Record<string, any>, path: string, value: any): Record<string, any> {
  const result = { ...obj };
  const segments = path.split('.');

  let curr = result;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i];
    if (curr[seg] === undefined || typeof curr[seg] !== 'object' || Array.isArray(curr[seg])) {
      curr[seg] = {};
    } else {
      curr[seg] = { ...curr[seg] };
    }
    curr = curr[seg];
  }

  curr[segments[segments.length - 1]] = value;
  return result;
}

/**
 * Extracts default configuration object from a manifest.
 * Can optionally take a client record to prefill matching fields.
 */
export function extractDefaultConfig(
  manifest: ReactTemplateManifest,
  clientRecord?: any
): Record<string, any> {
  let config: Record<string, any> = manifest.defaultConfig ? { ...manifest.defaultConfig } : {};

  // Fill field defaults
  manifest.fields.forEach((field) => {
    const existingVal = getNestedValue(config, field.key);
    if (existingVal === undefined) {
      let defaultVal = field.defaultValue;
      if (defaultVal === undefined) {
        switch (field.type) {
          case 'boolean':
            defaultVal = false;
            break;
          case 'number':
            defaultVal = 0;
            break;
          case 'color':
            defaultVal = '#111111';
            break;
          case 'select':
            defaultVal = field.options && field.options.length > 0 ? field.options[0] : '';
            break;
          default:
            defaultVal = '';
        }
      }
      config = setNestedValue(config, field.key, defaultVal);
    }
  });

  // Fill list defaults
  if (manifest.lists) {
    manifest.lists.forEach((list) => {
      const existingList = getNestedValue(config, list.key);
      if (!Array.isArray(existingList)) {
        config = setNestedValue(config, list.key, []);
      }
    });
  }

  // Pre-fill from client record if provided
  if (clientRecord) {
    config = applyClientRecordToConfig(config, clientRecord);
  }

  return config;
}

/**
 * Copies values from client record into matching config fields.
 */
export function applyClientRecordToConfig(
  currentConfig: Record<string, any>,
  client: any
): Record<string, any> {
  let config = { ...currentConfig };

  const mappings: Record<string, any> = {
    'details.businessName': client.businessName,
    'details.phone': client.phone,
    'details.email': client.email || client.portalUserEmail,
    'details.address': client.city ? `${client.city}, ${client.country || 'Ireland'}` : client.country,
    'assets.logo': client.logoDataUrl,
  };

  Object.entries(mappings).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      config = setNestedValue(config, key, val);
    }
  });

  return config;
}
