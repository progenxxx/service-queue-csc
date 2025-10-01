import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const POST = requireAuth(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      await db.update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, userId));

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);