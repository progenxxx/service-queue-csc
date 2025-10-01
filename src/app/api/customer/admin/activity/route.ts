import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { activityLogs } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET = requireRole(['customer_admin'])(
  async (req: NextRequest) => {
    try {
      const userCompanyId = req.headers.get('x-company-id');
      
      if (!userCompanyId) {
        return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
      }

      const recentActivities = await db.query.activityLogs.findMany({
        where: eq(activityLogs.companyId, userCompanyId),
        with: {
          user: {
            columns: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [desc(activityLogs.createdAt)],
        limit: 10,
      });

      const formattedActivities = recentActivities.map((activity) => ({
        id: activity.id,
        type: activity.type,
        description: activity.description,
        timestamp: new Date(activity.createdAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        user: activity.user || { firstName: 'Unknown', lastName: 'User' },
      }));

      return NextResponse.json({ activities: formattedActivities });
    } catch (error) {
      console.error('Failed to fetch activity:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);