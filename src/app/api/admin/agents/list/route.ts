import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { users, agents, companies } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';

type CompanyData = {
  id: string;
  companyName: string;
};

export const GET = requireRole(['super_admin'])(async () => {
  try {
    // Get all users with agent or agent_manager roles along with their agent details
    const agentUsers = await db.query.users.findMany({
      where: inArray(users.role, ['agent', 'agent_manager']),
      with: {
        agent: true,
        company: {
          columns: {
            id: true,
            companyName: true,
          },
        },
      },
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });

    const formattedAgents = await Promise.all(
      agentUsers
        .filter(user => user.agent) // Only include users with agent records
        .map(async (user) => {
          let assignedCompanies: CompanyData[] = [];

          // Get assigned companies from the agent's assignedCompanyIds
          if (user.agent?.assignedCompanyIds && user.agent.assignedCompanyIds.length > 0) {
            assignedCompanies = await db.query.companies.findMany({
              where: inArray(companies.id, user.agent.assignedCompanyIds),
              columns: {
                id: true,
                companyName: true,
              },
            });
          }

          return {
            id: user.id,
            agentId: user.agent!.id, // Non-null assertion since we filtered above
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            loginCode: user.loginCode || '',
            role: user.role,
            isActive: user.isActive,
            assignedCompanyIds: user.agent.assignedCompanyIds || [],
            assignedCompanies,
            createdAt: user.createdAt,
            canPromote: user.role === 'agent', // Can promote agents to agent_manager
            canDemote: user.role === 'agent_manager', // Can demote agent_managers to agent
          };
        })
    );

    return NextResponse.json({
      agents: formattedAgents,
      totalAgents: formattedAgents.filter(a => a.role === 'agent').length,
      totalManagers: formattedAgents.filter(a => a.role === 'agent_manager').length,
    });
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
});