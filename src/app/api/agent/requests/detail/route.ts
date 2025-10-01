import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { serviceRequests, users, requestAttachments, requestNotes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { blobService } from '@/lib/services/blob';
import { notificationService } from '@/lib/services/notification';

export const GET = requireRole(['agent', 'agent_manager'])(
  async (req: NextRequest) => {
    try {
      const url = new URL(req.url);
      const requestId = url.searchParams.get('id');
      
      if (!requestId) {
        return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
      }

      // Agents can access any request
      const request = await db.query.serviceRequests.findFirst({
        where: eq(serviceRequests.id, requestId),
        with: {
          assignedTo: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedBy: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          modifiedBy: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          company: {
            columns: {
              companyName: true,
              id: true,
            },
          },
          notes: {
            with: {
              author: {
                columns: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: (notes, { desc }) => [desc(notes.createdAt)],
          },
          attachments: {
            with: {
              uploadedBy: {
                columns: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: (attachments, { desc }) => [desc(attachments.createdAt)],
          },
        },
      });

      if (!request) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }

      return NextResponse.json({ request });
    } catch (error) {
      console.error('Failed to fetch request detail:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

export const PUT = requireRole(['agent', 'agent_manager', 'super_admin'])(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      const userRole = req.headers.get('x-user-role');
      const formData = await req.formData();
      
      const requestId = formData.get('requestId') as string;
      const insured = formData.get('insured') as string;
      const serviceRequestNarrative = formData.get('serviceRequestNarrative') as string;
      const serviceQueueCategory = formData.get('serviceQueueCategory') as string;
      const assignedById = formData.get('assignedById') as string;
      const assignedToId = formData.get('assignedToId') as string;
      const taskStatus = formData.get('taskStatus') as string;
      const dueDate = formData.get('dueDate') as string;
      const dueTime = formData.get('dueTime') as string;
      const closedAt = formData.get('closedAt') as string;
      const timeSpent = formData.get('timeSpent') as string;

      if (!requestId || !insured || !serviceRequestNarrative || !assignedById || !serviceQueueCategory) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Check if request exists
      const existingRequest = await db.query.serviceRequests.findFirst({
        where: eq(serviceRequests.id, requestId),
      });

      if (!existingRequest) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }

      // Validate that assignedById exists
      const assignedByUser = await db.query.users.findFirst({
        where: eq(users.id, assignedById),
      });

      if (!assignedByUser) {
        return NextResponse.json({ error: 'Assigned by user not found' }, { status: 400 });
      }

      // Use the assignedBy user's companyId for the request
      const companyId = assignedByUser.companyId;
      
      if (!companyId) {
        return NextResponse.json({ error: 'Assigned by user must be associated with a company' }, { status: 400 });
      }

      // Validate that assignedToId exists if provided (only for managers/super admins)
      if (assignedToId && (userRole === 'agent_manager' || userRole === 'super_admin')) {
        const assignedToUser = await db.query.users.findFirst({
          where: eq(users.id, assignedToId),
        });

        if (!assignedToUser) {
          return NextResponse.json({ error: 'Assigned to user not found' }, { status: 400 });
        }
      }

      // Check for status changes to track timestamps
      const now = new Date();
      const statusChanged = existingRequest.taskStatus !== taskStatus;

      // Update the service request
      const updateData: any = {
        insured,
        serviceRequestNarrative,
        serviceQueueCategory,
        assignedById,
        taskStatus,
        modifiedById: userId,
        updatedAt: now,
      };

      updateData.companyId = companyId;

      // Add time spent if provided
      if (timeSpent) {
        updateData.timeSpent = parseInt(timeSpent, 10);
      }

      // Only agent managers and super admins can change assignments
      if (userRole === 'agent_manager' || userRole === 'super_admin') {
        updateData.assignedToId = assignedToId || null;
      } else if (userRole === 'agent') {
        // Regular agents cannot change assignments - keep existing assignment
        updateData.assignedToId = existingRequest.assignedToId;
      }

      // Track status change timestamps and validate closure requirements
      if (statusChanged) {
        // Clear closedAt when reopening a closed task
        if (existingRequest.taskStatus === 'closed' && taskStatus !== 'closed') {
          updateData.closedAt = null;
        }

        if (taskStatus === 'in_progress' && !existingRequest.inProgressAt) {
          updateData.inProgressAt = now;
        } else if (taskStatus === 'closed' && !existingRequest.closedAt) {
          // Validate that task can be closed - require at least one note
          const existingNotes = await db.query.requestNotes.findMany({
            where: eq(requestNotes.requestId, requestId)
          });

          if (existingNotes.length === 0) {
            return NextResponse.json({
              error: 'Cannot close task without adding at least one note documenting the work completed'
            }, { status: 400 });
          }

          // Validate that task has been started (in progress) before being closed
          if (!existingRequest.inProgressAt) {
            return NextResponse.json({
              error: 'Cannot close task that has not been started. Please mark the task as "in progress" first to begin work.'
            }, { status: 400 });
          }

          // Validate that task has someone assigned to it before being closed
          if (!existingRequest.assignedToId) {
            return NextResponse.json({
              error: 'Cannot close task without assigning it to someone first. Please assign the task to an agent before closing.'
            }, { status: 400 });
          }

          updateData.closedAt = now;
        }
      }

      // Only agent managers and super admins can modify due dates, due times and close dates
      // Regular agents are not allowed to change due dates or due times
      if (userRole === 'agent_manager' || userRole === 'super_admin') {
        if (dueDate) {
          updateData.dueDate = new Date(dueDate);
        }
        if (dueTime) {
          updateData.dueTime = dueTime;
        }
        if (closedAt) {
          // Don't override closedAt if we're reopening a task (status changed from closed to non-closed)
          if (!(statusChanged && existingRequest.taskStatus === 'closed' && taskStatus !== 'closed')) {
            // Validate closure requirements even when directly setting closedAt
            const existingNotes = await db.query.requestNotes.findMany({
              where: eq(requestNotes.requestId, requestId)
            });

            if (existingNotes.length === 0) {
              return NextResponse.json({
                error: 'Cannot close task without adding at least one note documenting the work completed'
              }, { status: 400 });
            }

            if (!existingRequest.inProgressAt) {
              return NextResponse.json({
                error: 'Cannot close task that has not been started. Please mark the task as "in progress" first to begin work.'
              }, { status: 400 });
            }

            if (!existingRequest.assignedToId) {
              return NextResponse.json({
                error: 'Cannot close task without assigning it to someone first. Please assign the task to an agent before closing.'
              }, { status: 400 });
            }

            updateData.closedAt = new Date(closedAt);
          }
        }
      }


      await db.update(serviceRequests)
        .set(updateData)
        .where(eq(serviceRequests.id, requestId));

      // Use enhanced notification system for request updates
      if (userId) {
        const changes = {
          insured: insured !== existingRequest.insured ? insured : undefined,
          serviceQueueCategory: serviceQueueCategory !== existingRequest.serviceQueueCategory ? serviceQueueCategory : undefined,
          assignedById: assignedById !== existingRequest.assignedById ? assignedById : undefined,
          assignedToId: updateData.assignedToId !== existingRequest.assignedToId ? updateData.assignedToId : undefined,
          dueDate: updateData.dueDate?.toISOString() !== existingRequest.dueDate?.toISOString() ? updateData.dueDate?.toISOString() : undefined,
          dueTime: updateData.dueTime !== existingRequest.dueTime ? updateData.dueTime : undefined,
        };

        // Filter out undefined values
        const actualChanges = Object.fromEntries(
          Object.entries(changes).filter(([_, value]) => value !== undefined)
        );

        await notificationService.notifyRequestUpdated({
          requestId,
          serviceQueueId: existingRequest.serviceQueueId,
          updaterId: userId,
          companyId: existingRequest.companyId,
          changes: actualChanges,
          oldStatus: statusChanged ? existingRequest.taskStatus : undefined,
          newStatus: statusChanged ? taskStatus : undefined,
        });
      }

      // Handle file uploads if any
      const files = formData.getAll('files') as File[];
      const uploadResults: any[] = [];
      
      if (files.length > 0 && userId) {
        for (const file of files) {
          if (file.size > 0) {
            try {
              const uploadResult = await blobService.uploadFile({
                requestId,
                file,
                userId,
              });

              const [attachment] = await db.insert(requestAttachments).values({
                requestId,
                fileName: file.name,
                filePath: uploadResult.url,
                fileSize: uploadResult.fileSize,
                mimeType: uploadResult.mimeType,
                uploadedById: userId,
              }).returning();

              uploadResults.push(attachment);

              // Use enhanced notification system for file uploads
              await notificationService.notifyAttachmentUploaded({
                requestId,
                serviceQueueId: existingRequest.serviceQueueId,
                uploaderId: userId,
                companyId: existingRequest.companyId,
                fileName: file.name,
                fileSize: uploadResult.fileSize,
              });
            } catch (error) {
              // Continue processing other files even if one fails
            }
          }
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Request updated successfully',
        uploadedFiles: uploadResults.length
      });
    } catch (error) {
      console.error('Failed to update request:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);