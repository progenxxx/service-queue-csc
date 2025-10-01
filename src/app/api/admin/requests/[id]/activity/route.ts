import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { activityLogs } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      const url = new URL(req.url);
      const requestId = url.pathname.split('/')[4]; // Extract request ID from path

      if (!requestId) {
        return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
      }

      // Fetch activity logs for the specific request
      const activities = await db.query.activityLogs.findMany({
        where: eq(activityLogs.requestId, requestId),
        with: {
          user: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          company: {
            columns: {
              id: true,
              companyName: true,
            },
          },
        },
        orderBy: [desc(activityLogs.createdAt)],
      });

      return NextResponse.json({ activities });
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);