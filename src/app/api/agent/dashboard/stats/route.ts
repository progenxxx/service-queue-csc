import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { serviceRequests, agents } from '@/lib/db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';

export const GET = requireRole(['agent', 'agent_manager'])(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      const agent = await db.query.agents.findFirst({
        where: eq(agents.userId, userId),
      });

      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }

      const assignedStats = await db
        .select({
          total: sql<number>`count(*)`,
          new: sql<number>`count(*) filter (where task_status = 'new')`,
          inProgress: sql<number>`count(*) filter (where task_status = 'in_progress' or task_status = 'open')`,
          completed: sql<number>`count(*) filter (where task_status = 'closed' and date_trunc('day', updated_at) = date_trunc('day', now()))`,
          overdue: sql<number>`count(*) filter (where due_date < now() and task_status != 'closed')`,
        })
        .from(serviceRequests)
        .where(eq(serviceRequests.assignedToId, userId));

      const clientCount = await db
        .selectDistinct({ companyId: serviceRequests.companyId })
        .from(serviceRequests)
        .where(
          and(
            eq(serviceRequests.assignedToId, userId),
            agent.assignedCompanyIds ? inArray(serviceRequests.companyId, agent.assignedCompanyIds) : sql`true`
          )
        );

      return NextResponse.json({
        stats: {
          totalAssigned: assignedStats[0]?.total || 0,
          newRequests: assignedStats[0]?.new || 0,
          inProgressRequests: assignedStats[0]?.inProgress || 0,
          completedRequests: assignedStats[0]?.completed || 0,
          overdueRequests: assignedStats[0]?.overdue || 0,
          totalClients: clientCount.length,
        },
      });
    } catch {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);