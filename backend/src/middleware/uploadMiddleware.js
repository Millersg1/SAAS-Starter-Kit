import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { fileTypeFromBuffer } from 'file-type';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Sanitize brandId to prevent path traversal (allow only UUID chars)
    const brandId = (req.params.brandId || 'general').replace(/[^a-zA-Z0-9-]/g, '');
    const brandDir = path.join(uploadsDir, brandId);

    // Verify resolved path is still inside uploads directory
    const resolved = path.resolve(brandDir);
    if (!resolved.startsWith(path.resolve(uploadsDir))) {
      return cb(new Error('Invalid upload path'), null);
    }

    if (!fs.existsSync(brandDir)) {
      fs.mkdirSync(brandDir, { recursive: true });
    }

    cb(null, brandDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    // Other
    'application/json',
    'application/xml',
    'text/xml'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: PDF, Word, Excel, PowerPoint, Images, Archives, Text files.`), false);
  }
};

// Configure multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 10 // Allow multiple files
  }
});

// Middleware for single file upload
export const uploadSingle = upload.single('file');

// Middleware for multiple files upload
export const uploadMultiple = upload.array('files', 10); // Max 10 files

/**
 * Post-upload middleware: validate actual file content (magic bytes)
 * to prevent MIME type spoofing attacks.
 */
export const validateFileContent = async (req, res, next) => {
  const files = req.file ? [req.file] : (req.files || []);
  const dangerousExtensions = ['.php', '.sh', '.exe', '.bat', '.cmd', '.ps1', '.jsp', '.asp', '.aspx'];

  for (const file of files) {
    // Block dangerous extensions regardless of MIME type
    const ext = path.extname(file.originalname).toLowerCase();
    if (dangerousExtensions.includes(ext)) {
      deleteFile(file.path);
      return res.status(400).json({ status: 'fail', message: `File extension ${ext} is not allowed.` });
    }

    // For image files, validate magic bytes match the declared MIME type
    if (file.mimetype.startsWith('image/')) {
      try {
        const buffer = fs.readFileSync(file.path);
        const detected = await fileTypeFromBuffer(buffer);
        if (detected && !detected.mime.startsWith('image/')) {
          deleteFile(file.path);
          return res.status(400).json({ status: 'fail', message: 'File content does not match its declared type.' });
        }
      } catch {
        // If detection fails, allow — the MIME filter already passed
      }
    }
  }
  next();
};

// Error handling middleware
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'fail',
        message: 'File size too large. Maximum size is 50MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'fail',
        message: 'Too many files. Maximum is 10 files.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        status: 'fail',
        message: 'Unexpected field name. Use "file" for single upload or "files" for multiple.'
      });
    }
    return res.status(400).json({
      status: 'fail',
      message: `Upload error: ${err.message}`
    });
  }
  
  if (err) {
    return res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }
  
  next();
};

// Helper function to delete file
export const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file: - uploadMiddleware.js:136', error);
    return false;
  }
};

// Helper function to get file info
export const getFileInfo = (file) => {
  return {
    file_name: file.originalname,
    file_path: file.path,
    file_size: file.size,
    file_type: file.mimetype,
    file_extension: path.extname(file.originalname).toLowerCase()
  };
};

export default {
  uploadSingle,
  uploadMultiple,
  handleUploadError,
  deleteFile,
  getFileInfo
};
