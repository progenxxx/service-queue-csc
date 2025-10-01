import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { serviceRequests } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET = requireRole(['agent', 'agent_manager'])(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      const requests = await db.query.serviceRequests.findMany({
        where: eq(serviceRequests.assignedToId, userId),
        with: {
          assignedBy: true,
          modifiedBy: true,
          company: true,
        },
        orderBy: [desc(serviceRequests.createdAt)],
        limit: 10,
      });

      return NextResponse.json({ requests });
    } catch {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);