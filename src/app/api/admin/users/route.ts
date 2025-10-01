import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { desc, inArray } from 'drizzle-orm';

export const GET = requireRole(['super_admin', 'agent', 'agent_manager'])(
  async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const roleFilter = searchParams.get('role');

      let whereCondition;
      if (roleFilter === 'customers') {
        whereCondition = inArray(users.role, ['customer', 'customer_admin']);
      }

      const allUsers = await db.query.users.findMany({
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          companyId: true,
          isActive: true,
          createdAt: true,
        },
        with: {
          company: {
            columns: {
              id: true,
              companyName: true,
            },
          },
        },
        where: whereCondition,
        orderBy: [desc(users.createdAt)],
      });

      return NextResponse.json({ users: allUsers });
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);