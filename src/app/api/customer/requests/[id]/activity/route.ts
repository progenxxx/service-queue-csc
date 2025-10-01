import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { activityLogs, serviceRequests } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export const GET = requireRole(['customer', 'customer_admin'])(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      const companyId = req.headers.get('x-company-id');
      const url = new URL(req.url);
      const requestId = url.pathname.split('/')[4]; // Extract request ID from path

      if (!requestId || !userId || !companyId) {
        return NextResponse.json({ error: 'Request ID, User ID, and Company ID are required' }, { status: 400 });
      }

      // Verify the request belongs to the customer's company
      const request = await db.query.serviceRequests.findFirst({
        where: and(
          eq(serviceRequests.id, requestId),
          eq(serviceRequests.companyId, companyId)
        ),
      });

      if (!request) {
        return NextResponse.json({ error: 'Request not found or access denied' }, { status: 404 });
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