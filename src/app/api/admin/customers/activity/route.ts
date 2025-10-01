import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { activityLogs, companies } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  createdBy: string;
  createdAt: string;
  userInitials: string;
}

export const GET = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const customerId = searchParams.get('customerId');

      if (!customerId) {
        return NextResponse.json(
          { error: 'Customer ID is required' },
          { status: 400 }
        );
      }

      const customer = await db.query.companies.findFirst({
        where: eq(companies.id, customerId),
      });

      if (!customer) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }

      const recentActivities = await db.query.activityLogs.findMany({
        where: eq(activityLogs.companyId, customerId),
        with: {
          user: {
            columns: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [desc(activityLogs.createdAt)],
        limit: 15,
      });

      const formattedActivities: ActivityItem[] = recentActivities.map((activity) => ({
        id: activity.id,
        type: activity.type, 
        description: activity.description,
        createdBy: activity.user ? `${activity.user.firstName} ${activity.user.lastName}` : 'Unknown User',
        createdAt: new Date(activity.createdAt).toLocaleString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
        userInitials: activity.user 
          ? `${activity.user.firstName.charAt(0)}${activity.user.lastName.charAt(0)}`.toUpperCase()
          : 'UN',
      }));

      return NextResponse.json({
        success: true,
        activities: formattedActivities,
        customer: {
          id: customer.id,
          companyName: customer.companyName,
        },
      });
    } catch (error) {
      console.error('Failed to fetch customer activity:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);