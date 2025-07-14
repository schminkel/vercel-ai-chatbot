import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { deleteFileFromS3 } from '@/lib/s3';
import { S3_CONFIG } from '@/lib/s3-config';

export async function DELETE(request: Request) {
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
    // Only allow users to delete their own files (basic security check)
    if (!key.includes(`${S3_CONFIG.USER_FILES_PREFIX}/${session.user?.id}`) && !key.startsWith(`${S3_CONFIG.PUBLIC_FILES_PREFIX}/`)) {
      return NextResponse.json({ error: 'Unauthorized to delete this file' }, { status: 403 });
    }

    await deleteFileFromS3(key);
    
    return NextResponse.json({ 
      message: 'File deleted successfully',
      key: key 
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
