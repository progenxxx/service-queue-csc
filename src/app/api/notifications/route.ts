import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET = requireRole(['super_admin', 'customer_admin', 'customer', 'agent'])(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      const userNotifications = await db.query.notifications.findMany({
        where: eq(notifications.userId, userId),
        orderBy: [desc(notifications.createdAt)],
        limit: 50,
      });

      const formattedNotifications = userNotifications.map(notification => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: notification.read,
        timestamp: new Date(notification.createdAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        metadata: notification.metadata ? JSON.parse(notification.metadata) : null,
      }));

      return NextResponse.json({ 
        notifications: formattedNotifications,
        unreadCount: formattedNotifications.filter(n => !n.read).length
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);