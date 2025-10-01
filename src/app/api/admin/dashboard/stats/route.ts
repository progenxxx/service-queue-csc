import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { serviceRequests, users, companies } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';

export const GET = requireRole(['super_admin'])(
  async () => {
    try {
      // Use Promise.all to run queries concurrently instead of sequentially
      const [requestStats, customerCount, userStats] = await Promise.all([
        db.select({
          total: sql<number>`count(*)`,
          active: sql<number>`count(*) filter (where task_status != 'closed')`,
          completed: sql<number>`count(*) filter (where task_status = 'closed')`,
          overdue: sql<number>`count(*) filter (where due_date < now() and task_status != 'closed')`,
        }).from(serviceRequests),

        db.select({ 
          count: sql<number>`count(*)` 
        }).from(companies),

        db.select({
          total: sql<number>`count(*)`,
          agents: sql<number>`count(*) filter (where role = 'agent')`,
        }).from(users).where(eq(users.isActive, true))
      ]);

      return NextResponse.json({
        stats: {
          totalRequests: requestStats[0]?.total || 0,
          totalCustomers: customerCount[0]?.count || 0,
          totalAgents: userStats[0]?.agents || 0,
          totalUsers: userStats[0]?.total || 0,
          activeRequests: requestStats[0]?.active || 0,
          completedRequests: requestStats[0]?.completed || 0,
          overdueRequests: requestStats[0]?.overdue || 0,
        },
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);