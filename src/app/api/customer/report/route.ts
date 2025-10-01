import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { serviceRequests } from '@/lib/db/schema';
import { eq, and, gte, lte, count, sql } from 'drizzle-orm';
import { z } from 'zod';

const reportParamsSchema = z.object({
  status: z.enum(['all', 'new', 'open', 'in_progress', 'closed']).optional().default('all'),
  dateRange: z.enum(['all', 'today', 'week', 'month', 'quarter']).optional().default('all'),
  timeRange: z.enum(['daily', 'weekly', 'monthly']).optional().default('monthly'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

function getDateRange(range: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (range) {
    case 'today':
      return {
        start: startOfDay,
        end: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1)
      };
    case 'week':
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
      return {
        start: startOfWeek,
        end: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
      };
    case 'month':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start: startOfMonth, end: endOfMonth };
    case 'quarter':
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      const startOfQuarter = new Date(now.getFullYear(), quarterStart, 1);
      const endOfQuarter = new Date(now.getFullYear(), quarterStart + 3, 0, 23, 59, 59, 999);
      return { start: startOfQuarter, end: endOfQuarter };
    default:
      return null;
  }
}

function getMonthName(monthIndex: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[monthIndex];
}

export const GET = requireRole(['customer', 'customer_admin'])(
  async (req: NextRequest) => {
    try {
      const companyId = req.headers.get('x-company-id');
      
      if (!companyId) {
        return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
      }

      const { searchParams } = new URL(req.url);
      const params = reportParamsSchema.parse({
        status: searchParams.get('status') || 'all',
        dateRange: searchParams.get('dateRange') || 'all',
        timeRange: searchParams.get('timeRange') || 'monthly',
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
      });

      // Build base where conditions - always filter by customer's company
      const whereConditions: any[] = [eq(serviceRequests.companyId, companyId)];
      
      // Status filter
      if (params.status !== 'all') {
        whereConditions.push(eq(serviceRequests.taskStatus, params.status));
      }
      
      // Date range filter
      let dateFilter: { start: Date; end: Date } | null = null;
      if (params.startDate && params.endDate) {
        dateFilter = {
          start: new Date(params.startDate),
          end: new Date(params.endDate)
        };
      } else if (params.dateRange !== 'all') {
        dateFilter = getDateRange(params.dateRange);
      }
      
      if (dateFilter) {
        whereConditions.push(gte(serviceRequests.createdAt, dateFilter.start));
        whereConditions.push(lte(serviceRequests.createdAt, dateFilter.end));
      }

      // Get current totals (exclude status filter for overall counts)
      const baseConditions = whereConditions.filter(c => !c.toString().includes('task_status'));
      
      const currentTotals = await db
        .select({
          status: serviceRequests.taskStatus,
          count: count()
        })
        .from(serviceRequests)
        .where(baseConditions.length > 0 ? and(...baseConditions) : undefined)
        .groupBy(serviceRequests.taskStatus);

      // Calculate totals
      const statusCounts = {
        new: 0,
        open: 0,
        in_progress: 0,
        closed: 0,
      };
      
      currentTotals.forEach(row => {
        if (row.status in statusCounts) {
          statusCounts[row.status as keyof typeof statusCounts] = row.count;
        }
      });

      // Get past due count (tickets with dueDate < now and not closed)
      const now = new Date();
      const pastDueResult = await db
        .select({ count: count() })
        .from(serviceRequests)
        .where(
          and(
            eq(serviceRequests.companyId, companyId),
            lte(serviceRequests.dueDate, now),
            eq(serviceRequests.taskStatus, 'open')
          )
        );
      
      const totalTasksPastDue = pastDueResult[0]?.count || 0;

      // Calculate weekly change (compare current week vs previous week)
      const currentWeekStart = new Date();
      currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
      currentWeekStart.setHours(0, 0, 0, 0);
      
      const previousWeekStart = new Date(currentWeekStart);
      previousWeekStart.setDate(previousWeekStart.getDate() - 7);
      
      const currentWeekEnd = new Date(currentWeekStart);
      currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
      currentWeekEnd.setHours(23, 59, 59, 999);
      
      const previousWeekEnd = new Date(currentWeekStart);
      previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);
      previousWeekEnd.setHours(23, 59, 59, 999);

      // Current week counts
      const currentWeekCounts = await db
        .select({
          status: serviceRequests.taskStatus,
          count: count()
        })
        .from(serviceRequests)
        .where(
          and(
            eq(serviceRequests.companyId, companyId),
            gte(serviceRequests.createdAt, currentWeekStart),
            lte(serviceRequests.createdAt, currentWeekEnd)
          )
        )
        .groupBy(serviceRequests.taskStatus);

      // Previous week counts
      const previousWeekCounts = await db
        .select({
          status: serviceRequests.taskStatus,
          count: count()
        })
        .from(serviceRequests)
        .where(
          and(
            eq(serviceRequests.companyId, companyId),
            gte(serviceRequests.createdAt, previousWeekStart),
            lte(serviceRequests.createdAt, previousWeekEnd)
          )
        )
        .groupBy(serviceRequests.taskStatus);

      // Calculate percentage changes
      const currentWeekStatusCounts = { new: 0, open: 0, in_progress: 0, closed: 0 };
      const previousWeekStatusCounts = { new: 0, open: 0, in_progress: 0, closed: 0 };
      
      currentWeekCounts.forEach(row => {
        if (row.status in currentWeekStatusCounts) {
          currentWeekStatusCounts[row.status as keyof typeof currentWeekStatusCounts] = row.count;
        }
      });
      
      previousWeekCounts.forEach(row => {
        if (row.status in previousWeekStatusCounts) {
          previousWeekStatusCounts[row.status as keyof typeof previousWeekStatusCounts] = row.count;
        }
      });

      const calculatePercentageChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };

      // Get time-series data based on timeRange parameter
      const currentDate = new Date();
      let timeSeriesData: any[] = [];
      
      if (params.timeRange === 'daily') {
        // Use filtered date range or default to last 30 days
        const startDate = dateFilter ? dateFilter.start : new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        const endDate = dateFilter ? dateFilter.end : currentDate;
        
        const dailyStatusData = await db
          .select({
            date: sql`DATE(${serviceRequests.createdAt})`.as('date'),
            status: serviceRequests.taskStatus,
            count: count()
          })
          .from(serviceRequests)
          .where(
            and(
              eq(serviceRequests.companyId, companyId),
              gte(serviceRequests.createdAt, startDate),
              lte(serviceRequests.createdAt, endDate)
            )
          )
          .groupBy(
            sql`DATE(${serviceRequests.createdAt})`,
            serviceRequests.taskStatus
          );

        // Process daily data within the filtered range
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const maxDays = Math.min(daysDiff, 30); // Limit to 30 days for performance
        
        for (let i = 0; i < maxDays; i++) {
          const targetDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
          const targetDateString = targetDate.toISOString().split('T')[0];
          
          const dayStatusCounts = { new: 0, open: 0, in_progress: 0, closed: 0 };
          dailyStatusData
            .filter(row => row.date === targetDateString)
            .forEach(row => {
              if (row.status in dayStatusCounts) {
                dayStatusCounts[row.status as keyof typeof dayStatusCounts] = row.count;
              }
            });
          
          timeSeriesData.push({
            month: `${targetDate.getMonth() + 1}/${targetDate.getDate()}`,
            newTickets: dayStatusCounts.new,
            wipTickets: dayStatusCounts.in_progress + dayStatusCounts.open,
            closedTickets: dayStatusCounts.closed,
            totalPastDue: 0,
          });
        }
      } else if (params.timeRange === 'weekly') {
        // Use filtered date range or default to last 12 weeks
        const startDate = dateFilter ? dateFilter.start : new Date(currentDate.getTime() - 12 * 7 * 24 * 60 * 60 * 1000);
        const endDate = dateFilter ? dateFilter.end : currentDate;
        
        // Get all data in the range and group by week ranges manually
        const weeklyStatusData = await db
          .select({
            createdAt: serviceRequests.createdAt,
            status: serviceRequests.taskStatus,
            count: count()
          })
          .from(serviceRequests)
          .where(
            and(
              eq(serviceRequests.companyId, companyId),
              gte(serviceRequests.createdAt, startDate),
              lte(serviceRequests.createdAt, endDate)
            )
          )
          .groupBy(serviceRequests.createdAt, serviceRequests.taskStatus);

        // Process weekly data within the filtered range
        const weeksDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
        const maxWeeks = Math.min(weeksDiff, 12); // Limit to 12 weeks for performance
        
        for (let i = 0; i < maxWeeks; i++) {
          // Calculate week start from the filtered start date
          const weekStart = new Date(startDate);
          weekStart.setDate(startDate.getDate() + (i * 7));
          weekStart.setHours(0, 0, 0, 0);
          
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6); // End of the week
          weekEnd.setHours(23, 59, 59, 999);
          
          // Don't process weeks beyond the end date
          if (weekStart > endDate) break;
          
          const weekStatusCounts = { new: 0, open: 0, in_progress: 0, closed: 0 };
          
          // Count tickets created in this week range
          weeklyStatusData.forEach(row => {
            const createdDate = new Date(row.createdAt);
            if (createdDate >= weekStart && createdDate <= weekEnd) {
              if (row.status in weekStatusCounts) {
                weekStatusCounts[row.status as keyof typeof weekStatusCounts] += row.count;
              }
            }
          });
          
          // Format label as "MM/DD" for the week start
          const monthStr = (weekStart.getMonth() + 1).toString().padStart(2, '0');
          const dayStr = weekStart.getDate().toString().padStart(2, '0');
          
          timeSeriesData.push({
            month: `${monthStr}/${dayStr}`,
            newTickets: weekStatusCounts.new,
            wipTickets: weekStatusCounts.in_progress + weekStatusCounts.open,
            closedTickets: weekStatusCounts.closed,
            totalPastDue: 0,
          });
        }
      } else {
        // Use filtered date range or default to last 12 months
        const startDate = dateFilter ? dateFilter.start : new Date(currentDate.getFullYear(), currentDate.getMonth() - 11, 1);
        const endDate = dateFilter ? dateFilter.end : currentDate;
        
        // Get all data in the range
        const monthlyStatusData = await db
          .select({
            createdAt: serviceRequests.createdAt,
            status: serviceRequests.taskStatus,
            count: count()
          })
          .from(serviceRequests)
          .where(
            and(
              eq(serviceRequests.companyId, companyId),
              gte(serviceRequests.createdAt, startDate),
              lte(serviceRequests.createdAt, endDate)
            )
          )
          .groupBy(serviceRequests.createdAt, serviceRequests.taskStatus);

        // Process monthly data within the filtered range
        const monthsDiff = Math.ceil((endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()));
        const maxMonths = Math.min(monthsDiff + 1, 12); // Limit to 12 months for performance
        
        for (let i = 0; i < maxMonths; i++) {
          const monthStart = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
          const monthEnd = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 0, 23, 59, 59, 999);
          
          // Don't process months beyond the end date
          if (monthStart > endDate) break;
          
          const monthStatusCounts = { new: 0, open: 0, in_progress: 0, closed: 0 };
          
          // Count tickets created in this month range
          monthlyStatusData.forEach(row => {
            const createdDate = new Date(row.createdAt);
            if (createdDate >= monthStart && createdDate <= monthEnd) {
              if (row.status in monthStatusCounts) {
                monthStatusCounts[row.status as keyof typeof monthStatusCounts] += row.count;
              }
            }
          });
          
          timeSeriesData.push({
            month: getMonthName(monthStart.getMonth()),
            newTickets: monthStatusCounts.new,
            wipTickets: monthStatusCounts.in_progress + monthStatusCounts.open,
            closedTickets: monthStatusCounts.closed,
            totalPastDue: 0,
          });
        }
      }

      const response = {
        summary: {
          totalNewTickets: statusCounts.new,
          totalWipTickets: statusCounts.open + statusCounts.in_progress,
          totalClosedTickets: statusCounts.closed,
          totalTasksPastDue,
          weeklyChange: {
            newTickets: calculatePercentageChange(currentWeekStatusCounts.new, previousWeekStatusCounts.new),
            wipTickets: calculatePercentageChange(
              currentWeekStatusCounts.open + currentWeekStatusCounts.in_progress,
              previousWeekStatusCounts.open + previousWeekStatusCounts.in_progress
            ),
            closedTickets: calculatePercentageChange(currentWeekStatusCounts.closed, previousWeekStatusCounts.closed),
            pastDueTickets: calculatePercentageChange(
              currentWeekStatusCounts.open,
              previousWeekStatusCounts.open
            ),
          }
        },
        monthlyData: timeSeriesData,
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error('Failed to generate customer report:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);