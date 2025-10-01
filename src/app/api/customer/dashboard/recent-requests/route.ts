import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { serviceRequests } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET = requireRole(['customer', 'customer_admin'])(
  async (req: NextRequest) => {
    try {
      const companyId = req.headers.get('x-company-id');
      
      if (!companyId) {
        return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
      }

      const requests = await db.query.serviceRequests.findMany({
        where: eq(serviceRequests.companyId, companyId),
        with: {
          assignedTo: true,
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