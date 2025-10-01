import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { serviceRequests } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export const GET = requireRole(['customer', 'customer_admin'])(
  async (req: NextRequest) => {
    try {
      const companyId = req.headers.get('x-company-id');
      
      if (!companyId) {
        return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
      }

      const stats = await db
        .select({
          total: sql<number>`count(*)`,
          new: sql<number>`count(*) filter (where task_status = 'new')`,
          inProgress: sql<number>`count(*) filter (where task_status = 'in_progress' or task_status = 'open')`,
          completed: sql<number>`count(*) filter (where task_status = 'closed')`,
          overdue: sql<number>`count(*) filter (where due_date < now() and task_status != 'closed')`,
        })
        .from(serviceRequests)
        .where(eq(serviceRequests.companyId, companyId));

      return NextResponse.json({
        stats: {
          totalRequests: stats[0]?.total || 0,
          newRequests: stats[0]?.new || 0,
          inProgressRequests: stats[0]?.inProgress || 0,
          completedRequests: stats[0]?.completed || 0,
          overdueRequests: stats[0]?.overdue || 0,
        },
      });
    } catch {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);