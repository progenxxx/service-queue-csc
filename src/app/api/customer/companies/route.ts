import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const GET = requireRole(['customer', 'customer_admin'])(
  async (req) => {
    try {
      const userCompanyId = req.headers.get('x-company-id');
      
      if (!userCompanyId) {
        return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
      }

      const userCompany = await db.query.companies.findFirst({
        where: eq(companies.id, userCompanyId),
        columns: {
          id: true,
          companyName: true,
          primaryContact: true,
          email: true,
          phone: true,
        },
      });

      if (!userCompany) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 });
      }

      return NextResponse.json({ companies: [userCompany] });
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);