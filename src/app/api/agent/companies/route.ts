import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';

export const GET = requireRole(['agent', 'agent_manager'])(
  async (req: NextRequest) => {
    try {
      // Agents can see all companies
      const allCompanies = await db.query.companies.findMany({
        columns: {
          id: true,
          companyName: true,
          primaryContact: true,
          phone: true,
          email: true,
        },
        orderBy: (companies, { asc }) => [asc(companies.companyName)],
      });

      return NextResponse.json({ companies: allCompanies });
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);