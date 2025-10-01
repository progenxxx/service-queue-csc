import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { serviceRequests, users, requestAttachments, requestNotes } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { blobService } from '@/lib/services/blob';
import { notificationService } from '@/lib/services/notification';

export const GET = requireRole(['customer', 'customer_admin', 'agent'])(
  async (req: NextRequest) => {
    try {
      const companyId = req.headers.get('x-company-id');
      const userRole = req.headers.get('x-user-role');
      const url = new URL(req.url);
      const requestId = url.searchParams.get('id');
      
      if (!requestId) {
        return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
      }

      if (!companyId && userRole !== 'agent') {
        return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
      }

      let whereClause;
      if (userRole === 'agent') {
        whereClause = eq(serviceRequests.id, requestId);
      } else {
        whereClause = and(
          eq(serviceRequests.id, requestId),
          eq(serviceRequests.companyId, companyId!)
        );
      }

      const request = await db.query.serviceRequests.findFirst({
        where: whereClause,
        with: {
          assignedTo: {
            columns: {
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
          company: {
            columns: {
              companyName: true,
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

export const PUT = requireRole(['customer', 'customer_admin'])(
  async (req: NextRequest) => {
    try {
      const companyId = req.headers.get('x-company-id');
      const userId = req.headers.get('x-user-id');
      const formData = await req.formData();
      
      const requestId = formData.get('requestId') as string;
      const insured = formData.get('insured') as string;
      const serviceRequestNarrative = formData.get('serviceRequestNarrative') as string;
      const serviceQueueCategory = formData.get('serviceQueueCategory') as string;
      const assignedById = formData.get('assignedById') as string;
      const taskStatus = formData.get('taskStatus') as string;
      const dueDate = formData.get('dueDate') as string;
      const dueTime = formData.get('dueTime') as string;
      
      if (!requestId || !insured || !serviceRequestNarrative || !assignedById || !serviceQueueCategory) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      if (!companyId) {
        return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
      }

      // Check if request exists and belongs to the user's company
      const existingRequest = await db.query.serviceRequests.findFirst({
        where: and(
          eq(serviceRequests.id, requestId),
          eq(serviceRequests.companyId, companyId)
        ),
      });

      if (!existingRequest) {
        return NextResponse.json({ error: 'Request not found or access denied' }, { status: 404 });
      }

      // Validate that assignedById exists and belongs to the same company
      const assignedByUser = await db.query.users.findFirst({
        where: and(
          eq(users.id, assignedById),
          eq(users.companyId, companyId)
        ),
      });

      if (!assignedByUser) {
        return NextResponse.json({ error: 'Assigned by user not found in your company' }, { status: 400 });
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
        companyId, // Keep the same company (from current user's context)
        modifiedById: userId,
        updatedAt: now,
      };

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

      // Customers can modify due dates
      if (dueDate) {
        updateData.dueDate = new Date(dueDate);
      }

      if (dueTime) {
        updateData.dueTime = dueTime;
      }

      await db.update(serviceRequests)
        .set(updateData)
        .where(eq(serviceRequests.id, requestId));

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

              await notificationService.createNotification({
                userId,
                type: 'attachment_uploaded',
                title: 'File Uploaded',
                message: `File "${file.name}" uploaded successfully to request ${existingRequest.serviceQueueId}`,
                metadata: JSON.stringify({ 
                  requestId,
                  fileName: file.name,
                  fileSize: uploadResult.fileSize 
                }),
              });

              await notificationService.createActivityLog({
                userId,
                companyId: existingRequest.companyId,
                type: 'attachment_uploaded',
                description: `Uploaded file "${file.name}" (${(uploadResult.fileSize / 1024).toFixed(1)}KB) to request ${existingRequest.serviceQueueId}`,
                requestId,
                metadata: JSON.stringify({ 
                  fileName: file.name,
                  fileSize: uploadResult.fileSize,
                  mimeType: uploadResult.mimeType 
                }),
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