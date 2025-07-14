import { useState, useEffect } from 'react';

/**
 * Hook to convert S3 URLs to presigned URLs for frontend display
 * This ensures images from private S3 buckets can be displayed in the UI
 */
export function usePresignedUrl(url: string): string {
  const [presignedUrl, setPresignedUrl] = useState<string>(url);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function generatePresignedUrl() {
      // Check if this is an S3 URL from our bucket
      const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME;
      const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1';
      
      if (!bucketName || !url.includes(`${bucketName}.s3.${region}.amazonaws.com`)) {
        // Not an S3 URL from our bucket, use original URL
        setPresignedUrl(url);
        return;
      }

      try {
        setIsLoading(true);
        
        // Extract the S3 key from the URL
        const urlParts = url.split('/');
        const key = urlParts.slice(3).join('/'); // Remove protocol, domain, and first slash
        
        // Call our API to get a presigned URL
        const response = await fetch(`/api/files/download?key=${encodeURIComponent(key)}`);
        
        if (response.ok) {
          const data = await response.json();
          setPresignedUrl(data.url);
        } else {
          console.error('Failed to get presigned URL:', response.statusText);
          // Fallback to original URL
          setPresignedUrl(url);
        }
      } catch (error) {
        console.error('Error generating presigned URL:', error);
        // Fallback to original URL
        setPresignedUrl(url);
      } finally {
        setIsLoading(false);
      }
    }

    // Only generate presigned URL if this looks like an S3 URL
    if (url.includes('.s3.') && url.includes('.amazonaws.com')) {
      generatePresignedUrl();
    } else {
      setPresignedUrl(url);
    }
  }, [url]);

  return isLoading ? url : presignedUrl; // Return original URL while loading
}
