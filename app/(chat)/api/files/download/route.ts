import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { generatePresignedDownloadUrl } from '@/lib/s3';

export async function GET(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'File key is required' }, { status: 400 });
  }

  try {
    // Generate a presigned URL for secure file access
    const presignedUrl = await generatePresignedDownloadUrl(key, 3600); // 1 hour expiry
    
    return NextResponse.json({ 
      url: presignedUrl,
      key: key 
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }
}
