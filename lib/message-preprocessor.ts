import { generatePresignedDownloadUrl } from './s3';
import type { ChatMessage } from './types';

/**
 * Converts S3 URLs in message parts to presigned URLs that AI models can access
 * This is necessary because private S3 buckets cannot be accessed by AI models directly
 */
export async function preprocessMessagesForAI(messages: ChatMessage[]): Promise<ChatMessage[]> {
  const processedMessages = await Promise.all(
    messages.map(async (message) => {
      if (message.parts && message.parts.length > 0) {
        const processedParts = await Promise.all(
          message.parts.map(async (part) => {
            // Process file parts that contain S3 URLs
            if (part.type === 'file' && part.url) {
              // Check if this is an S3 URL from our bucket
              const bucketName = process.env.AWS_S3_BUCKET_NAME;
              const region = process.env.AWS_REGION || 'us-east-1';
              
              if (bucketName && part.url.includes(`${bucketName}.s3.${region}.amazonaws.com`)) {
                try {
                  // Extract the S3 key from the URL
                  const urlParts = part.url.split('/');
                  const key = urlParts.slice(3).join('/'); // Remove protocol, domain, and first slash
                  
                  // Generate a presigned URL that AI models can access
                  const presignedUrl = await generatePresignedDownloadUrl(key, 3600); // 1 hour expiry
                  
                  return {
                    ...part,
                    url: presignedUrl,
                  };
                } catch (error) {
                  console.error('Failed to generate presigned URL for file:', part.url, error);
                  // Return original part if presigned URL generation fails
                  return part;
                }
              }
            }
            
            return part;
          })
        );
        
        return {
          ...message,
          parts: processedParts,
        };
      }
      
      return message;
    })
  );
  
  return processedMessages;
}
