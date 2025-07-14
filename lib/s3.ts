import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { validateS3Config, S3_CONFIG } from './s3-config';

// Lazy initialization of S3 client
let s3Client: S3Client | null = null;
let config: ReturnType<typeof validateS3Config> | null = null;

function getS3Client() {
  if (!s3Client || !config) {
    config = validateS3Config();
    s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return { client: s3Client, config };
}

/**
 * Upload a file to S3
 */
export async function uploadFileToS3(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string,
): Promise<{ url: string; key: string }> {
  const { client, config } = getS3Client();
  
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await client.send(command);

  // Return the public URL
  const url = `https://${config.bucketName}.s3.${config.region}.amazonaws.com/${key}`;
  
  return { url, key };
}

/**
 * Generate a presigned URL for file upload (for client-side uploads)
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600, // 1 hour
): Promise<string> {
  const { client, config } = getS3Client();
  
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate a presigned URL for file download
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600, // 1 hour
): Promise<string> {
  const { client, config } = getS3Client();
  
  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn });
}

/**
 * Delete a file from S3
 */
export async function deleteFileFromS3(key: string): Promise<void> {
  const { client, config } = getS3Client();
  
  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  await client.send(command);
}

/**
 * Get the public URL for a file (if bucket allows public access)
 */
export function getPublicFileUrl(key: string): string {
  const { config } = getS3Client();
  return `https://${config.bucketName}.s3.${config.region}.amazonaws.com/${key}`;
}

/**
 * Generate a unique file key with timestamp and random suffix
 */
export function generateFileKey(originalName: string, userId?: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  const baseName = originalName.replace(/\.[^/.]+$/, "");
  
  const prefix = userId ? `${S3_CONFIG.USER_FILES_PREFIX}/${userId}` : S3_CONFIG.PUBLIC_FILES_PREFIX;
  
  return `${prefix}/${timestamp}-${randomSuffix}-${baseName}.${extension}`;
}
