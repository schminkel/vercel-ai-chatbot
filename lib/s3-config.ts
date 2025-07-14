/**
 * S3 Configuration Validation
 * Validates that all required AWS S3 environment variables are set
 */

export function validateS3Config() {
  const requiredEnvVars = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY', 
    'AWS_S3_BUCKET_NAME',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required AWS S3 environment variables: ${missingVars.join(', ')}\n` +
      'Please set these variables in your .env.local file or deployment environment.\n' +
      'See .env.example for reference.'
    );
  }

  return {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    region: process.env.AWS_REGION || 'us-east-1',
    bucketName: process.env.AWS_S3_BUCKET_NAME!,
  };
}

export const S3_CONFIG = {
  // Default values
  DEFAULT_REGION: 'us-east-1',
  DEFAULT_EXPIRY: 3600, // 1 hour
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  
  // File path patterns
  USER_FILES_PREFIX: 'users',
  PUBLIC_FILES_PREFIX: 'uploads',
} as const;
