import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const POST = requireRole(['super_admin', 'customer_admin', 'customer', 'agent'])(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      const body = await req.json();
      const { notificationId } = body;

      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      if (!notificationId) {
        return NextResponse.json(
          { error: 'Notification ID is required' },
          { status: 400 }
        );
      }

      const result = await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
          )
        );

      return NextResponse.json({ 
        success: true, 
        message: 'Notification marked as read'
      });
    } catch (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);