import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { uploadPaths, safeStoredName } from '../utils/files.js';

function storage(directory) {
  return multer.diskStorage({
    destination: async (_req, _file, cb) => {
      await fs.mkdir(directory, { recursive: true });
      cb(null, directory);
    },
    filename: (_req, file, cb) => cb(null, safeStoredName(file.originalname)),
  });
}

function uploader(directory, mimeTypes) {
  return multer({
    storage: storage(directory),
    limits: { fileSize: 5 * 1024 * 1024, files: 4 },
    fileFilter: (_req, file, cb) => {
      if (!mimeTypes.has(file.mimetype)) {
        cb(new Error('Upload a JPG, PNG, WebP, or PDF file in an accepted field.'));
        return;
      }
      cb(null, true);
    },
  });
}

const images = new Set(['image/jpeg', 'image/png', 'image/webp']);
const docs = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export const bookingPhotoUpload = uploader(uploadPaths.bookingPhotos, images).array('photos', 4);
export const portfolioUpload = uploader(uploadPaths.portfolio, images).single('image');
export const documentUpload = uploader(uploadPaths.documents, docs).single('document');

export function uploadErrorMessage(error) {
  return error?.message || 'Upload failed.';
}

export function storedFileName(file) {
  return path.basename(file.filename);
}
