import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { companies, serviceRequests, users } from '@/lib/db/schema';
import { sql, eq, inArray, and } from 'drizzle-orm';

export const GET = requireRole(['super_admin', 'agent_manager'])(
  async () => {
    try {
      const customers = await db
        .select({
          id: companies.id,
          companyName: companies.companyName,
          companyCode: companies.companyCode,
          primaryContact: companies.primaryContact,
          email: companies.email,
          phone: companies.phone,
          createdAt: companies.createdAt,
          updatedAt: companies.updatedAt,
          modifiedBy: companies.primaryContact,
          modifiedOn: sql<string>`to_char(${companies.updatedAt}, 'MM/DD/YYYY HH12:MI AM')`,
        })
        .from(companies)
        .orderBy(companies.companyName);

      const customersWithTicketCounts = await Promise.all(
        customers.map(async (customer) => {
          const openTickets = await db
            .select({ count: sql<number>`count(*)::integer` })
            .from(serviceRequests)
            .where(and(
              eq(serviceRequests.companyId, customer.id),
              inArray(serviceRequests.taskStatus, ['new', 'open'])
            ));

          const wipTickets = await db
            .select({ count: sql<number>`count(*)::integer` })
            .from(serviceRequests)
            .where(and(
              eq(serviceRequests.companyId, customer.id),
              eq(serviceRequests.taskStatus, 'in_progress')
            ));

          const closedTickets = await db
            .select({ count: sql<number>`count(*)::integer` })
            .from(serviceRequests)
            .where(and(
              eq(serviceRequests.companyId, customer.id),
              eq(serviceRequests.taskStatus, 'closed')
            ));

          const totalTickets = await db
            .select({ count: sql<number>`count(*)::integer` })
            .from(serviceRequests)
            .where(eq(serviceRequests.companyId, customer.id));

          const activeUsers = await db
            .select({ count: sql<number>`count(*)::integer` })
            .from(users)
            .where(and(
              eq(users.companyId, customer.id),
              eq(users.isActive, true)
            ));

          const totalUsers = await db
            .select({ count: sql<number>`count(*)::integer` })
            .from(users)
            .where(eq(users.companyId, customer.id));

          const lastRequest = await db
            .select({
              lastRequestDate: sql<string>`to_char(max(${serviceRequests.createdAt}), 'MM/DD/YYYY HH12:MI AM')`
            })
            .from(serviceRequests)
            .where(eq(serviceRequests.companyId, customer.id));

          const openCount = Number(openTickets[0]?.count) || 0;
          const wipCount = Number(wipTickets[0]?.count) || 0;
          const closedCount = Number(closedTickets[0]?.count) || 0;
          const totalCount = Number(totalTickets[0]?.count) || 0;
          const activeUserCount = Number(activeUsers[0]?.count) || 0;
          const totalUserCount = Number(totalUsers[0]?.count) || 0;

          const completionRate = totalCount > 0 
            ? Math.round((closedCount / totalCount) * 100) 
            : 0;
          
          const activeTickets = openCount + wipCount;
          const hasRecentActivity = lastRequest[0]?.lastRequestDate !== null;
          
          let status = 'inactive';
          if (hasRecentActivity && lastRequest[0]?.lastRequestDate) {
            const lastRequestDate = new Date(lastRequest[0].lastRequestDate);
            const daysSinceLastRequest = Math.floor(
              (Date.now() - lastRequestDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            
            if (daysSinceLastRequest <= 7) {
              status = 'very_active';
            } else if (daysSinceLastRequest <= 30) {
              status = 'active';
            } else if (daysSinceLastRequest <= 90) {
              status = 'moderate';
            } else {
              status = 'low_activity';
            }
          }

          return {
            ...customer,
            openTickets: openCount,
            wipTickets: wipCount,
            closedTickets: closedCount,
            totalTickets: totalCount,
            activeUsers: activeUserCount,
            totalUsers: totalUserCount,
            completionRate,
            activeTickets,
            hasRecentActivity,
            status,
            lastRequestDate: lastRequest[0]?.lastRequestDate || null,
            daysSinceLastActivity: hasRecentActivity && lastRequest[0]?.lastRequestDate
              ? Math.floor((Date.now() - new Date(lastRequest[0].lastRequestDate).getTime()) / (1000 * 60 * 60 * 24))
              : null
          };
        })
      );

      const summary = {
        totalCustomers: customers.length,
        activeCustomers: customersWithTicketCounts.filter(c => c.status === 'very_active' || c.status === 'active').length,
        totalTickets: customersWithTicketCounts.reduce((sum, c) => sum + c.totalTickets, 0),
        totalOpenTickets: customersWithTicketCounts.reduce((sum, c) => sum + c.openTickets, 0),
        totalWipTickets: customersWithTicketCounts.reduce((sum, c) => sum + c.wipTickets, 0),
        totalClosedTickets: customersWithTicketCounts.reduce((sum, c) => sum + c.closedTickets, 0),
        totalUsers: customersWithTicketCounts.reduce((sum, c) => sum + c.totalUsers, 0),
        totalActiveUsers: customersWithTicketCounts.reduce((sum, c) => sum + c.activeUsers, 0),
        averageCompletionRate: customers.length > 0 
          ? Math.round(customersWithTicketCounts.reduce((sum, c) => sum + c.completionRate, 0) / customers.length)
          : 0
      };

      return NextResponse.json({ 
        customers: customersWithTicketCounts,
        summary 
      });
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

export const HEAD = requireRole(['super_admin', 'agent_manager'])(
  async () => {
    try {
      const customerCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(companies);

      return new NextResponse(null, {
        status: 200,
        headers: {
          'X-Total-Customers': customerCount[0]?.count?.toString() || '0'
        }
      });
    } catch (error) {
      console.error('Failed to fetch customer count:', error);
      return new NextResponse(null, { status: 500 });
    }
  }
);