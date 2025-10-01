import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const PUT = requireAuth(async (request: AuthenticatedRequest) => {
  try {
    if (!request.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { timezone } = body;

    if (!timezone || typeof timezone !== 'string') {
      return NextResponse.json({ error: 'Invalid timezone' }, { status: 400 });
    }

    // Update user's timezone
    await db
      .update(users)
      .set({ timezone, updatedAt: new Date() })
      .where(eq(users.id, request.user.id));

    return NextResponse.json({ success: true, timezone });
  } catch (error) {
    console.error('Error updating timezone:', error);
    return NextResponse.json({ error: 'Failed to update timezone' }, { status: 500 });
  }
});