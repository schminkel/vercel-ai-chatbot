// Test URL decoding
const encodedKeys = [
  'users/b29e419b-6adf-40e9-b4fa-c3438312c669/1752503150475-se4g3fz7yur-IMG_0284%20Large.jpeg',
  'users/b29e419b-6adf-40e9-b4fa-c3438312c669/1752503292959-36fu66kkmji-IMG_0291%202.jpeg'
];

console.log('Testing URL decoding:');
encodedKeys.forEach(key => {
  const decoded = decodeURIComponent(key);
  console.log(`Encoded: ${key}`);
  console.log(`Decoded: ${decoded}`);
  console.log('---');
});
