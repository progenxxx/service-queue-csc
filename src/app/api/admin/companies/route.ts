import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export const GET = requireRole(['super_admin'])(
  async () => {
    try {
      const allCompanies = await db.query.companies.findMany({
        columns: {
          id: true,
          companyName: true,
          primaryContact: true,
          email: true,
          phone: true,
        },
        orderBy: [desc(companies.createdAt)],
      });

      return NextResponse.json({ companies: allCompanies });
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);