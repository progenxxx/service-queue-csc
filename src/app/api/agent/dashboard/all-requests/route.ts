import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { serviceRequests, agents } from '@/lib/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';

export const GET = requireRole(['agent', 'agent_manager'])(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      const userRole = req.headers.get('x-user-role');

      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      const agent = await db.query.agents.findFirst({
        where: eq(agents.userId, userId),
      });

      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }

      let whereClause;

      if (userRole === 'agent_manager') {
        // Agent managers can see all requests from their assigned companies
        if (agent.assignedCompanyIds && agent.assignedCompanyIds.length > 0) {
          whereClause = inArray(serviceRequests.companyId, agent.assignedCompanyIds);
        } else {
          // If no assigned companies, show all requests (for system-wide agent managers)
          whereClause = undefined;
        }
      } else {
        // Regular agents only see requests from their assigned companies
        if (agent.assignedCompanyIds && agent.assignedCompanyIds.length > 0) {
          whereClause = inArray(serviceRequests.companyId, agent.assignedCompanyIds);
        } else {
          whereClause = undefined;
        }
      }

      const requests = await db.query.serviceRequests.findMany({
        where: whereClause,
        with: {
          assignedBy: true,
          modifiedBy: true,
          company: true,
        },
        orderBy: [desc(serviceRequests.createdAt)],
        limit: 20,
      });

      return NextResponse.json({ requests });
    } catch {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);