import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect } from '../middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagesDir = path.join(__dirname, '../../uploads/images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Multer saves the raw upload; sharp/heic-convert process it afterwards
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, imagesDir),
  filename: (req, file, cb) => {
    const base = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extMap = {
      'image/jpeg': '.jpg',
      'image/png':  '.png',
      'image/gif':  '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'image/heic': '.jpg', // will be converted or served as-is
      'image/heif': '.jpg',
    };
    cb(null, `${base}${extMap[file.mimetype] || '.jpg'}`);
  }
});

const imageFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/heic',   // iPhone HEIC (desktop transfer)
    'image/heif',
  ];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported type. Allowed: JPEG, PNG, GIF, WebP, SVG, HEIC.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB raw — compressed output will be far smaller
});

// ── Image processing pipeline ────────────────────────────────────────────────
// Max dimension: 1600 px (preserves aspect ratio)
// Output:        JPEG @ 85% quality (≈ 200–500 KB for a typical phone photo)
// SVG:           skipped (already small, no rasterisation needed)

async function optimiseImage(filePath, mimeType) {
  if (mimeType === 'image/svg+xml') return; // nothing to do

  // Try to use sharp for optimisation; fall back to saving the raw file if unavailable
  try {
    const sharp = (await import('sharp')).default;
    let inputBuffer;

    if (mimeType === 'image/heic' || mimeType === 'image/heif') {
      const heicConvert = (await import('heic-convert')).default;
      const raw = fs.readFileSync(filePath);
      inputBuffer = await heicConvert({ buffer: raw, format: 'JPEG', quality: 1 });
    } else {
      inputBuffer = fs.readFileSync(filePath);
    }

    const outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    fs.writeFileSync(filePath, outputBuffer);
  } catch (err) {
    // sharp not available — file already saved by multer, serve as-is
    console.warn('Image optimisation skipped (sharp unavailable):', err.message);
  }
}

// ── Route ────────────────────────────────────────────────────────────────────

const router = express.Router();

router.post('/image', protect, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'fail', message: 'No image file provided.' });
  }

  try {
    await optimiseImage(req.file.path, req.file.mimetype);
  } catch (err) {
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    return res.status(422).json({
      status: 'fail',
      message: 'Could not process image. Try a different file or export as JPEG.',
    });
  }

  const filename = path.basename(req.file.path);
  const baseUrl = process.env.API_URL || `https://${req.get('host')}`;
  res.status(200).json({ status: 'success', data: { url: `${baseUrl}/images/${filename}` } });
});

// Multer / general error handler
router.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ status: 'fail', message: err.message });
  }
  next();
});

export default router;
