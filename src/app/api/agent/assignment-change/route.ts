import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { serviceRequests, users, assignmentChangeRequests } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { notificationService } from '@/lib/services/notification';

const requestAssignmentChangeSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  requestedAssigneeId: z.string().optional(),
  reason: z.string().min(1, 'Reason is required'),
});

export const POST = requireRole(['agent', 'agent_manager'])(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      const body = await req.json();

      if (!userId) {
        return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
      }

      const validatedData = requestAssignmentChangeSchema.parse(body);

      // Verify the request exists and get current assignment info
      const request = await db.query.serviceRequests.findFirst({
        where: eq(serviceRequests.id, validatedData.requestId),
        with: {
          assignedTo: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          company: {
            columns: {
              id: true,
              companyName: true,
            },
          },
        },
      });

      if (!request) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }

      // Check if there's already a pending assignment change request for this service request
      const existingChangeRequest = await db.query.assignmentChangeRequests.findFirst({
        where: and(
          eq(assignmentChangeRequests.requestId, validatedData.requestId),
          eq(assignmentChangeRequests.status, 'pending')
        ),
      });

      if (existingChangeRequest) {
        return NextResponse.json({
          error: 'There is already a pending assignment change request for this task'
        }, { status: 400 });
      }

      // Verify the requested assignee exists if provided
      let requestedAssignee: any = null;
      if (validatedData.requestedAssigneeId) {
        requestedAssignee = await db.query.users.findFirst({
          where: eq(users.id, validatedData.requestedAssigneeId),
        });

        if (!requestedAssignee) {
          return NextResponse.json({ error: 'Requested assignee not found' }, { status: 400 });
        }

        if (requestedAssignee.role !== 'agent' && requestedAssignee.role !== 'agent_manager') {
          return NextResponse.json({
            error: 'Requested assignee must be an agent or agent manager'
          }, { status: 400 });
        }
      }

      // Create the assignment change request
      const [changeRequest] = await db.insert(assignmentChangeRequests).values({
        requestId: validatedData.requestId,
        requestedById: userId,
        currentAssigneeId: request.assignedToId,
        requestedAssigneeId: validatedData.requestedAssigneeId || null,
        reason: validatedData.reason,
        status: 'pending',
      }).returning();

      // Get all agent managers to notify them
      const agentManagers = await db.query.users.findMany({
        where: eq(users.role, 'agent_manager'),
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      // Get the requesting user info
      const requestingUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      // Send notifications and emails to agent managers
      await notificationService.notifyAssignmentChangeRequested({
        requestId: request.id,
        serviceQueueId: request.serviceQueueId,
        requesterId: userId,
        companyId: request.companyId,
        reason: validatedData.reason,
        currentAssigneeId: request.assignedToId || undefined,
        requestedAssigneeId: validatedData.requestedAssigneeId,
        changeRequestId: changeRequest.id,
      });

      return NextResponse.json({
        success: true,
        changeRequest: {
          id: changeRequest.id,
          status: changeRequest.status,
          reason: changeRequest.reason,
          createdAt: changeRequest.createdAt,
        },
        message: 'Assignment change request submitted successfully. Agent managers have been notified.',
      });

    } catch (error) {
      console.error('Failed to create assignment change request:', error);

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.issues },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create assignment change request. Please try again.' },
        { status: 500 }
      );
    }
  }
);

// GET endpoint to fetch assignment change requests for an agent
export const GET = requireRole(['agent', 'agent_manager', 'super_admin'])(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      const userRole = req.headers.get('x-user-role');
      const url = new URL(req.url);
      const requestId = url.searchParams.get('requestId');

      if (!userId) {
        return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
      }

      let whereCondition;

      if (requestId) {
        // Get assignment change requests for a specific service request
        whereCondition = eq(assignmentChangeRequests.requestId, requestId);
      } else if (userRole === 'agent_manager' || userRole === 'super_admin') {
        // Agent managers can see all pending requests
        whereCondition = eq(assignmentChangeRequests.status, 'pending');
      } else {
        // Regular agents can only see their own requests
        whereCondition = eq(assignmentChangeRequests.requestedById, userId);
      }

      const changeRequests = await db.query.assignmentChangeRequests.findMany({
        where: whereCondition,
        with: {
          request: {
            columns: {
              id: true,
              serviceQueueId: true,
              insured: true,
              serviceRequestNarrative: true,
            },
          },
          requestedBy: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          currentAssignee: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          requestedAssignee: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          reviewedBy: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: (changeRequests, { desc }) => [desc(changeRequests.createdAt)],
      });

      return NextResponse.json({ changeRequests });

    } catch (error) {
      console.error('Failed to fetch assignment change requests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch assignment change requests.' },
        { status: 500 }
      );
    }
  }
);