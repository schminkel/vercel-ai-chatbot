import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { uploadFileToS3, generateFileKey } from '@/lib/s3';
import { S3_CONFIG } from '@/lib/s3-config';

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= S3_CONFIG.MAX_FILE_SIZE, {
      message: `File size should be less than ${S3_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`,
    })
    // Update the file type based on the kind of files you want to accept
    .refine((file) => S3_CONFIG.ALLOWED_TYPES.includes(file.type as any), {
      message: `File type should be one of: ${S3_CONFIG.ALLOWED_TYPES.join(', ')}`,
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = (formData.get('file') as File).name;
    const fileBuffer = await file.arrayBuffer();

    try {
      // Generate a unique key for the file
      const fileKey = generateFileKey(filename, session.user?.id);
      
      // Upload to S3
      const result = await uploadFileToS3(
        fileKey,
        Buffer.from(fileBuffer),
        file.type
      );

      return NextResponse.json({
        url: result.url,
        pathname: filename,
        contentType: file.type,
        key: result.key,
      });
    } catch (error) {
      console.error('S3 upload error:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
