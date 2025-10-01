import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { agents } from '@/lib/db/schema';

export const GET = requireRole(['agent', 'agent_manager'])(async () => {
  try {
    const agentsWithDetails = await db.query.agents.findMany({
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,
            role: true,
          },
        },
      },
      orderBy: (agents, { desc }) => [desc(agents.createdAt)],
    });

    const formattedAgents = agentsWithDetails
      .filter(agent => agent.user.isActive)
      .map(agent => ({
        id: agent.user.id,
        firstName: agent.user.firstName,
        lastName: agent.user.lastName,
        email: agent.user.email,
        role: agent.user.role,
      }));

    return NextResponse.json({ agents: formattedAgents });
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});