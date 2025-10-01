import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const GET = requireRole(['agent', 'agent_manager'])(
  async (req: NextRequest) => {
    try {
      const url = new URL(req.url);
      const customerId = url.searchParams.get('customerId');
      
      if (!customerId) {
        return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
      }

      // Get users for the specified company
      const companyUsers = await db.query.users.findMany({
        where: eq(users.companyId, customerId),
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
        orderBy: (users, { asc }) => [asc(users.firstName), asc(users.lastName)],
      });

      return NextResponse.json({ users: companyUsers });
    } catch (error) {
      console.error('Failed to fetch customer users:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);