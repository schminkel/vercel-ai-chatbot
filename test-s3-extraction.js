// Test S3 URL extraction
function extractS3KeyFromUrl(url) {
  try {
    const urlObj = new URL(url);
    console.log(`Extracting S3 key from URL: ${url}`);
    console.log(`Hostname: ${urlObj.hostname}, Pathname: ${urlObj.pathname}`);
    
    // Check if it's an S3 URL (various formats)
    if (
      urlObj.hostname.includes('amazonaws.com') ||
      urlObj.hostname.includes('s3') ||
      urlObj.hostname.endsWith('.s3.amazonaws.com')
    ) {
      // For URLs like: https://bucket.s3.region.amazonaws.com/key
      // or https://s3.region.amazonaws.com/bucket/key
      let key = urlObj.pathname.substring(1); // Remove leading slash
      
      // Handle different S3 URL formats
      if (urlObj.hostname.includes('s3.') && !urlObj.hostname.startsWith('s3.')) {
        // Format: https://bucket.s3.region.amazonaws.com/key
        key = urlObj.pathname.substring(1);
      } else if (urlObj.hostname.startsWith('s3.')) {
        // Format: https://s3.region.amazonaws.com/bucket/key
        const pathParts = urlObj.pathname.substring(1).split('/');
        if (pathParts.length > 1) {
          key = pathParts.slice(1).join('/'); // Remove bucket name, keep the rest
        }
      }
      
      console.log(`Extracted S3 key: ${key}`);
      return key;
    }
    
    console.log('URL is not an S3 URL');
  } catch (error) {
    console.error('Error parsing URL:', error);
  }
  return undefined;
}

// Test various S3 URL formats
const testUrls = [
  'https://schminkel-chatbot-files.s3.eu-central-1.amazonaws.com/uploads/user123/image_1234567890_abc.jpg',
  'https://s3.eu-central-1.amazonaws.com/schminkel-chatbot-files/uploads/user123/image_1234567890_abc.jpg',
  'https://schminkel-chatbot-files.s3.amazonaws.com/uploads/user123/image_1234567890_abc.jpg'
];

testUrls.forEach(url => {
  console.log('\n--- Testing URL ---');
  const key = extractS3KeyFromUrl(url);
  console.log(`Result: ${key}\n`);
});
