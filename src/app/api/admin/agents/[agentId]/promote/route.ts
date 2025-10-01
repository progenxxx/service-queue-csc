import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notificationService } from '@/lib/services/notification';

export const POST = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      const url = new URL(req.url);
      const agentId = url.pathname.split('/')[4]; // Extract agent ID from path
      const { role } = await req.json();

      if (!userId) {
        return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
      }

      if (!agentId) {
        return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
      }

      if (!role || !['agent', 'agent_manager'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role. Must be "agent" or "agent_manager"' }, { status: 400 });
      }

      // Find the agent to be promoted/demoted
      const agent = await db.query.users.findFirst({
        where: eq(users.id, agentId),
        with: {
          company: {
            columns: {
              companyName: true,
            },
          },
        },
      });

      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }

      if (!['agent', 'agent_manager'].includes(agent.role)) {
        return NextResponse.json({ error: 'Can only promote/demote agent roles' }, { status: 400 });
      }

      // Update the agent's role
      await db.update(users)
        .set({
          role: role as 'agent' | 'agent_manager',
          updatedAt: new Date()
        })
        .where(eq(users.id, agentId));

      // Create activity log
      const action = role === 'agent_manager' ? 'promoted to' : 'demoted from';
      await notificationService.createActivityLog({
        userId,
        companyId: agent.companyId || undefined,
        type: 'user_updated',
        description: `${agent.firstName} ${agent.lastName} ${action} Agent Manager role`,
        metadata: JSON.stringify({
          agentId: agent.id,
          previousRole: agent.role,
          newRole: role,
          promotedBy: userId,
        }),
      });

      // Create notification for the agent
      const notificationTitle = role === 'agent_manager'
        ? 'Promoted to Agent Manager'
        : 'Role Updated to Agent';
      const notificationMessage = role === 'agent_manager'
        ? 'You have been promoted to Agent Manager. You now have permission to assign tasks to other agents.'
        : 'Your role has been updated to Agent.';

      await notificationService.createNotification({
        userId: agentId,
        type: 'user_created', // Using closest available type for user role changes
        title: notificationTitle,
        message: notificationMessage,
        metadata: JSON.stringify({
          newRole: role,
          updatedBy: userId,
        }),
      });

      return NextResponse.json({
        success: true,
        message: `Agent ${action} ${role === 'agent_manager' ? 'Agent Manager' : 'Agent'} successfully`,
        agent: {
          id: agent.id,
          firstName: agent.firstName,
          lastName: agent.lastName,
          email: agent.email,
          previousRole: agent.role,
          newRole: role,
        },
      });

    } catch (error) {
      console.error('Failed to update agent role:', error);
      return NextResponse.json(
        { error: 'Failed to update agent role. Please try again.' },
        { status: 500 }
      );
    }
  }
);