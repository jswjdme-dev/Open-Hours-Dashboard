/**
 * Minimal, standard-compliant STORED (uncompressed) PKZIP generator in pure TypeScript.
 * Zero external dependencies.
 *
 * Spec reference: PKWARE APPNOTE.TXT (PKZIP Format)
 * Compression method: 0 (STORED)
 */

// Precomputed CRC-32 table
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC32_TABLE[i] = c;
}

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipFileInput {
  name: string;
  content: Uint8Array | string;
}

/**
 * Creates an uncompressed standard ZIP file from an array of files.
 */
export function createStoredZip(files: ZipFileInput[]): Uint8Array {
  const encoder = new TextEncoder();

  // Normalize entries to Uint8Array
  const normalized = files.map((file) => {
    const rawPath = file.name.replace(/\\/g, '/').replace(/^\/+/, '');
    const pathBytes = encoder.encode(rawPath);
    const dataBytes =
      typeof file.content === 'string'
        ? encoder.encode(file.content)
        : file.content;
    const checksum = crc32(dataBytes);

    return {
      path: rawPath,
      pathBytes,
      dataBytes,
      checksum,
      size: dataBytes.length,
    };
  });

  // Calculate total buffer length
  // Local header: 30 bytes + pathLength + dataLength
  // Central header: 46 bytes + pathLength
  // End of Central Directory: 22 bytes
  let totalLength = 22;
  for (const item of normalized) {
    totalLength += 30 + item.pathBytes.length + item.size;
    totalLength += 46 + item.pathBytes.length;
  }

  const buffer = new Uint8Array(totalLength);
  const view = new DataView(buffer.buffer);
  let offset = 0;

  // 1. Write Local File Headers and Data
  const localHeaderOffsets: number[] = [];

  const now = new Date();
  const dosTime =
    ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const dosDate =
    (((now.getFullYear() - 1980) << 9) |
      ((now.getMonth() + 1) << 5) |
      now.getDate()) &
    0xffff;

  for (const item of normalized) {
    localHeaderOffsets.push(offset);

    // Signature: 0x04034b50 ("PK\x03\x04")
    view.setUint32(offset, 0x04034b50, true);
    view.setUint16(offset + 4, 20, true); // Version needed to extract (2.0)
    view.setUint16(offset + 6, 0x0800, true); // Flags: UTF-8 filename (bit 11)
    view.setUint16(offset + 8, 0, true); // Compression method: 0 (STORED)
    view.setUint16(offset + 10, dosTime, true);
    view.setUint16(offset + 12, dosDate, true);
    view.setUint32(offset + 14, item.checksum, true); // CRC-32
    view.setUint32(offset + 18, item.size, true); // Compressed size
    view.setUint32(offset + 22, item.size, true); // Uncompressed size
    view.setUint16(offset + 26, item.pathBytes.length, true); // Filename length
    view.setUint16(offset + 28, 0, true); // Extra field length

    offset += 30;

    // Filename
    buffer.set(item.pathBytes, offset);
    offset += item.pathBytes.length;

    // File Data
    buffer.set(item.dataBytes, offset);
    offset += item.size;
  }

  // 2. Write Central Directory Headers
  const centralDirectoryStart = offset;

  for (let i = 0; i < normalized.length; i++) {
    const item = normalized[i];
    const localOffset = localHeaderOffsets[i];

    // Signature: 0x02014b50 ("PK\x01\x02")
    view.setUint32(offset, 0x02014b50, true);
    view.setUint16(offset + 4, 20, true); // Version made by (2.0)
    view.setUint16(offset + 6, 20, true); // Version needed (2.0)
    view.setUint16(offset + 8, 0x0800, true); // Flags: UTF-8 filename
    view.setUint16(offset + 10, 0, true); // Compression: 0 (STORED)
    view.setUint16(offset + 12, dosTime, true);
    view.setUint16(offset + 14, dosDate, true);
    view.setUint32(offset + 16, item.checksum, true);
    view.setUint32(offset + 20, item.size, true);
    view.setUint32(offset + 24, item.size, true);
    view.setUint16(offset + 28, item.pathBytes.length, true);
    view.setUint16(offset + 30, 0, true); // Extra field length
    view.setUint16(offset + 32, 0, true); // File comment length
    view.setUint16(offset + 34, 0, true); // Disk number start
    view.setUint16(offset + 36, 0, true); // Internal attributes
    view.setUint32(offset + 38, 0, true); // External attributes
    view.setUint32(offset + 42, localOffset, true); // Relative offset of local header

    offset += 46;

    buffer.set(item.pathBytes, offset);
    offset += item.pathBytes.length;
  }

  const centralDirectorySize = offset - centralDirectoryStart;

  // 3. Write End of Central Directory Record (EOCD)
  // Signature: 0x06054b50 ("PK\x05\x06")
  view.setUint32(offset, 0x06054b50, true);
  view.setUint16(offset + 4, 0, true); // Disk number
  view.setUint16(offset + 6, 0, true); // Disk where CD starts
  view.setUint16(offset + 8, normalized.length, true); // Number of records on this disk
  view.setUint16(offset + 10, normalized.length, true); // Total number of records
  view.setUint32(offset + 12, centralDirectorySize, true); // Size of central directory
  view.setUint32(offset + 16, centralDirectoryStart, true); // Offset of start of CD
  view.setUint16(offset + 20, 0, true); // Comment length

  return buffer;
}

/**
 * Triggers a client-side download of a ZIP file in the browser.
 */
export function downloadZip(filename: string, files: ZipFileInput[]): void {
  const bytes = createStoredZip(files);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.zip') ? filename : `${filename}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Converts a base64 Data URL to a Uint8Array.
 */
export function dataUrlToUint8Array(dataUrl: string): { bytes: Uint8Array; extension: string } {
  try {
    const parts = dataUrl.split(',');
    const meta = parts[0];
    const base64Data = parts[1] || '';
    let ext = 'png';
    if (meta.includes('image/jpeg') || meta.includes('image/jpg')) ext = 'jpg';
    else if (meta.includes('image/webp')) ext = 'webp';
    else if (meta.includes('image/svg+xml')) ext = 'svg';

    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return { bytes, extension: ext };
  } catch {
    return { bytes: new Uint8Array(0), extension: 'png' };
  }
}
