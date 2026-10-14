import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { ApiError } from './apiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.resolve(__dirname, '../../uploads');

export const uploadPaths = {
  portfolio: path.join(UPLOAD_ROOT, 'public', 'portfolio'),
  documents: path.join(UPLOAD_ROOT, 'private', 'documents'),
  bookingPhotos: path.join(UPLOAD_ROOT, 'private', 'booking-photos'),
};

export async function ensureUploadDirs() {
  await Promise.all(Object.values(uploadPaths).map((dir) => fs.mkdir(dir, { recursive: true })));
}

export function safeStoredName(originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);
  const safeExt = allowed.has(ext) ? ext : '';
  return `${crypto.randomBytes(16).toString('hex')}${safeExt}`;
}

export function resolveStoredFile(directory, storedName) {
  if (!/^[a-f0-9]{32}\.(jpg|jpeg|png|webp|pdf)$/.test(storedName || '')) {
    throw new ApiError(400, 'Invalid file.');
  }
  const base = path.resolve(directory);
  const resolved = path.resolve(directory, storedName);
  const relative = path.relative(base, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new ApiError(400, 'Invalid file.');
  }
  return resolved;
}

export async function assertFileSignature(filePath, mimeType) {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(12);
    await handle.read(buffer, 0, 12, 0);
    const ok = matchesSignature(buffer, mimeType);
    if (!ok) throw new ApiError(400, 'The uploaded file content does not match its type.');
  } finally {
    await handle.close();
  }
}

function matchesSignature(buffer, mimeType) {
  if (mimeType === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === 'image/png') return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  if (mimeType === 'application/pdf') return buffer.subarray(0, 4).toString() === '%PDF';
  if (mimeType === 'image/webp') {
    return buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP';
  }
  return false;
}

export async function removeFileQuietly(filePath) {
  if (!filePath) return;
  await fs.unlink(filePath).catch(() => {});
}
