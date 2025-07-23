import { auth } from '@/app/(auth)/auth';
import { reorderPrompts } from '@/lib/db/queries';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { promptId, newOrder } = body;

    if (!promptId || !newOrder) {
      return NextResponse.json(
        { error: 'Missing required fields: promptId, newOrder' },
        { status: 400 },
      );
    }

    await reorderPrompts({
      userId: session.user.id,
      promptId,
      newOrder,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to reorder prompts:', error);
    return NextResponse.json(
      { error: 'Failed to reorder prompts' },
      { status: 500 },
    );
  }
}
