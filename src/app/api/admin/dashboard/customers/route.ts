import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { companies, serviceRequests } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export const GET = requireRole(['super_admin'])(
  async () => {
    try {
      const customers = await db
        .select({
          id: companies.id,
          companyName: companies.companyName,
          primaryContact: companies.primaryContact,
          email: companies.email,
          openTickets: sql<number>`coalesce((
            select count(*) 
            from ${serviceRequests} 
            where ${serviceRequests.companyId} = ${companies.id} 
            and ${serviceRequests.taskStatus} in ('new', 'open')
          ), 0)`,
          wipTickets: sql<number>`coalesce((
            select count(*) 
            from ${serviceRequests} 
            where ${serviceRequests.companyId} = ${companies.id} 
            and ${serviceRequests.taskStatus} = 'in_progress'
          ), 0)`,
          closedTickets: sql<number>`coalesce((
            select count(*) 
            from ${serviceRequests} 
            where ${serviceRequests.companyId} = ${companies.id} 
            and ${serviceRequests.taskStatus} = 'closed'
          ), 0)`,
          modifiedBy: companies.primaryContact,
          modifiedOn: sql<string>`to_char(${companies.updatedAt}, 'MM/DD/YYYY HH12:MI AM')`,
        })
        .from(companies)
        .orderBy(companies.companyName);

      return NextResponse.json({ customers });
    } catch {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);