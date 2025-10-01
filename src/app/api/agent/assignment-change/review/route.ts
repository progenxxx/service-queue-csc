import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { serviceRequests, users, assignmentChangeRequests } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { notificationService } from '@/lib/services/notification';
import { emailService } from '@/lib/email/sendgrid';

const reviewAssignmentChangeSchema = z.object({
  changeRequestId: z.string().min(1, 'Change request ID is required'),
  action: z.enum(['approve', 'reject']),
  reviewComment: z.string().optional(),
});

export const POST = requireRole(['agent_manager', 'super_admin'])(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      const body = await req.json();

      if (!userId) {
        return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
      }

      const validatedData = reviewAssignmentChangeSchema.parse(body);

      // Get the change request with all related data
      const changeRequest = await db.query.assignmentChangeRequests.findFirst({
        where: eq(assignmentChangeRequests.id, validatedData.changeRequestId),
        with: {
          request: {
            with: {
              company: {
                columns: {
                  id: true,
                  companyName: true,
                },
              },
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
        },
      });

      if (!changeRequest) {
        return NextResponse.json({ error: 'Assignment change request not found' }, { status: 404 });
      }

      if (changeRequest.status !== 'pending') {
        return NextResponse.json({
          error: 'This assignment change request has already been reviewed'
        }, { status: 400 });
      }

      const newStatus = validatedData.action === 'approve' ? 'approved' : 'rejected';

      // Update the assignment change request
      await db.update(assignmentChangeRequests)
        .set({
          status: newStatus,
          reviewedById: userId,
          reviewComment: validatedData.reviewComment || null,
          updatedAt: new Date(),
        })
        .where(eq(assignmentChangeRequests.id, validatedData.changeRequestId));

      // If approved, update the actual service request assignment
      if (validatedData.action === 'approve') {

        await db.update(serviceRequests)
          .set({
            assignedToId: changeRequest.requestedAssigneeId,
            modifiedById: userId,
            updatedAt: new Date(),
          })
          .where(eq(serviceRequests.id, changeRequest.requestId));
      }

      // Get the reviewing user info
      const reviewingUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      // Send notifications and emails using the centralized service
      await notificationService.notifyAssignmentChangeReviewed({
        requestId: changeRequest.requestId,
        serviceQueueId: changeRequest.request.serviceQueueId,
        reviewerId: userId,
        companyId: changeRequest.request.companyId,
        action: validatedData.action === 'approve' ? 'approved' : 'rejected',
        comment: validatedData.reviewComment,
        requesterId: changeRequest.requestedById,
        newAssigneeId: changeRequest.requestedAssigneeId || undefined,
      });

      return NextResponse.json({
        success: true,
        action: validatedData.action,
        message: `Assignment change request ${validatedData.action}d successfully.`,
        changeRequest: {
          id: changeRequest.id,
          status: newStatus,
          reviewComment: validatedData.reviewComment,
          updatedAt: new Date(),
        },
      });

    } catch (error) {
      console.error('Failed to review assignment change request:', error);

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.issues },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to review assignment change request. Please try again.' },
        { status: 500 }
      );
    }
  }
);