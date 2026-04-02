import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

/**
 * Unified storage service — supports S3/R2/MinIO or local filesystem fallback.
 * Set STORAGE_PROVIDER=s3 and configure S3_* env vars for cloud storage.
 */

const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local'; // 's3' or 'local'

// S3-compatible client (works with AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces)
let s3Client = null;
if (STORAGE_PROVIDER === 's3') {
  const config = {
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  };
  // Custom endpoint for R2, MinIO, etc.
  if (process.env.S3_ENDPOINT) {
    config.endpoint = process.env.S3_ENDPOINT;
    config.forcePathStyle = true;
  }
  s3Client = new S3Client(config);
}

const S3_BUCKET = process.env.S3_BUCKET || 'saassurface-uploads';
const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

/**
 * Upload a file to storage.
 * @param {Buffer|Stream} fileBuffer - File content
 * @param {string} key - Storage key/path (e.g., 'images/abc123.jpg')
 * @param {object} options - { contentType, metadata }
 * @returns {{ url: string, key: string, provider: string }}
 */
export async function uploadFile(fileBuffer, key, options = {}) {
  if (STORAGE_PROVIDER === 's3' && s3Client) {
    return uploadToS3(fileBuffer, key, options);
  }
  return uploadToLocal(fileBuffer, key, options);
}

async function uploadToS3(fileBuffer, key, options) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: options.contentType || 'application/octet-stream',
    Metadata: options.metadata || {},
  });
  await s3Client.send(command);

  // Public URL or signed URL based on bucket config
  const publicUrl = process.env.S3_PUBLIC_URL
    ? `${process.env.S3_PUBLIC_URL}/${key}`
    : `https://${S3_BUCKET}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com/${key}`;

  return { url: publicUrl, key, provider: 's3' };
}

async function uploadToLocal(fileBuffer, key, _options) {
  const filePath = path.join(LOCAL_UPLOAD_DIR, key);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, fileBuffer);

  const apiUrl = process.env.API_URL || 'http://localhost:5000';
  return { url: `${apiUrl}/${key}`, key, provider: 'local' };
}

/**
 * Get a signed download URL (S3) or local path.
 * @param {string} key - Storage key
 * @param {number} expiresIn - Seconds until URL expires (default 3600)
 */
export async function getFileUrl(key, expiresIn = 3600) {
  if (STORAGE_PROVIDER === 's3' && s3Client) {
    const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
    return getSignedUrl(s3Client, command, { expiresIn });
  }
  const apiUrl = process.env.API_URL || 'http://localhost:5000';
  return `${apiUrl}/${key}`;
}

/**
 * Delete a file from storage.
 */
export async function deleteFile(key) {
  if (STORAGE_PROVIDER === 's3' && s3Client) {
    const command = new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key });
    await s3Client.send(command);
    return;
  }
  const filePath = path.join(LOCAL_UPLOAD_DIR, key);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Generate a unique storage key for uploads.
 */
export function generateKey(folder, originalName) {
  const ext = path.extname(originalName);
  const hash = crypto.randomBytes(16).toString('hex');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
  return `${folder}/${date}/${hash}${ext}`;
}

export default { uploadFile, getFileUrl, deleteFile, generateKey };
