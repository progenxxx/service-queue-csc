import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { serviceRequests, companies, users, requestNotes, agents, requestAttachments } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { emailService } from '@/lib/email/sendgrid';
import { blobService } from '@/lib/services/blob';
import { notificationService } from '@/lib/services/notification';

function generateServiceQueueId(): string {
  const prefix = 'ServQUE';
  const timestamp = Date.now().toString();
  return `${prefix}-${timestamp}`;
}

export const GET = requireRole(['super_admin'])(
  async () => {
    try {
      const notes = await db.query.requestNotes.findMany({
        with: {
          author: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          request: {
            with: {
              company: {
                columns: {
                  companyName: true,
                },
              },
            },
          },
        },
        orderBy: [desc(requestNotes.createdAt)],
      });

      return NextResponse.json({ notes });
    } catch (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

export const POST = requireRole(['super_admin', 'agent_manager', 'customer_admin', 'customer'])(
  async (request: NextRequest) => {
    try {
      const formData = await request.formData();
      
      const insured = formData.get('insured') as string;
      const serviceRequestNarrative = formData.get('serviceRequestNarrative') as string;
      const serviceQueueCategory = formData.get('serviceQueueCategory') as string;
      const dueDateStr = formData.get('dueDate') as string;
      const dueTimeStr = formData.get('dueTime') as string;
      const serviceQueueId = formData.get('serviceQueueId') as string || generateServiceQueueId();
      const assignedByIdRaw = formData.get('assignedById') as string;

      if (!insured || !serviceRequestNarrative || !assignedByIdRaw || !serviceQueueCategory) {
        return NextResponse.json(
          { error: 'Insured, service request narrative, service queue category, and assigned by are required' },
          { status: 400 }
        );
      }

      const currentUserId = request.headers.get('x-user-id');
      const currentUserRole = request.headers.get('x-user-role');
      const currentUserCompanyId = request.headers.get('x-company-id');

      if (!currentUserId) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Get the user who is assigning the request to infer the company
      const assignedByUser = await db.query.users.findFirst({
        where: eq(users.id, assignedByIdRaw),
      });

      if (!assignedByUser) {
        return NextResponse.json(
          { error: 'Invalid assigned by user' },
          { status: 400 }
        );
      }

      if (!assignedByUser.companyId) {
        // For super_admin or agent users without companyId, we need to handle this differently
        if (assignedByUser.role === 'super_admin' || assignedByUser.role === 'agent') {
          return NextResponse.json(
            { error: 'Super admin and agent users must select a customer with a company to assign requests' },
            { status: 400 }
          );
        } else {
          return NextResponse.json(
            { error: 'Assigned by user must be associated with a company' },
            { status: 400 }
          );
        }
      }

      const finalCompanyId = assignedByUser.companyId;

      // Check for assignedToId - this might be an agent ID that needs conversion
      const assignedToIdRaw = formData.get('assignedToId') as string;
      let finalAssignedToId = assignedToIdRaw;

      if (assignedToIdRaw) {
        const agentCheck = await db.query.agents.findFirst({
          where: eq(agents.id, assignedToIdRaw),
          with: {
            user: {
              columns: {
                id: true,
              },
            },
          },
        });

        if (agentCheck) {
          finalAssignedToId = agentCheck.user.id;
        } else {
          const userCheck = await db.query.users.findFirst({
            where: eq(users.id, assignedToIdRaw),
          });

          if (!userCheck) {
            return NextResponse.json(
              { error: 'Invalid assigned to user' },
              { status: 400 }
            );
          }
        }
      }

      const dueDate = dueDateStr ? new Date(dueDateStr) : null;

      const newRequest = await db.insert(serviceRequests).values({
        serviceQueueId,
        insured,
        companyId: finalCompanyId,
        serviceRequestNarrative,
        serviceQueueCategory: serviceQueueCategory as 'policy_inquiry' | 'claims_processing' | 'account_update' | 'technical_support' | 'billing_inquiry' | 'insured_service_cancel_non_renewal' | 'other',
        assignedById: assignedByIdRaw,
        assignedToId: finalAssignedToId,
        dueDate,
        dueTime: dueTimeStr || null,
        taskStatus: 'new',
      }).returning();

      if (finalAssignedToId) {
        try {
          const assignedToUser = await db.query.users.findFirst({
            where: eq(users.id, finalAssignedToId),
            columns: {
              email: true,
              firstName: true,
              lastName: true,
            },
          });

          const requestCreator = await db.query.users.findFirst({
            where: eq(users.id, currentUserId),
            columns: {
              firstName: true,
              lastName: true,
            },
          });

          if (assignedToUser) {
            await emailService.sendNewRequest(assignedToUser.email, {
              requestId: newRequest[0].id,
              serviceQueueId: newRequest[0].serviceQueueId,
              clientName: insured,
              requestTitle: serviceRequestNarrative,
              category: serviceQueueCategory,
              createdBy: requestCreator ? `${requestCreator.firstName} ${requestCreator.lastName}` : 'Unknown',
              priority: dueDate ? 'High' : 'Normal',
              userType: 'agent',
            });
          }
        } catch (emailError) {
          console.error('Failed to send new request notification email:', emailError);
        }
      }

      // Handle file uploads
      const files = formData.getAll('files') as File[];
      if (files.length > 0) {
        const uploadResults: any[] = [];
        const currentUserId = request.headers.get('x-user-id');
        
        for (const file of files) {
          if (file.size > 0) {
            try {
              const uploadResult = await Promise.race([
                blobService.uploadFile({
                  requestId: newRequest[0].id,
                  file,
                  userId: currentUserId!,
                }),
                new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
                )
              ]);

              const [attachment] = await db.insert(requestAttachments).values({
                requestId: newRequest[0].id,
                fileName: file.name,
                filePath: uploadResult.url,
                fileSize: uploadResult.fileSize,
                mimeType: uploadResult.mimeType,
                uploadedById: currentUserId!,
              }).returning();

              uploadResults.push(attachment);

              await notificationService.createNotification({
                userId: currentUserId!,
                type: 'attachment_uploaded',
                title: 'File Uploaded',
                message: `File "${file.name}" uploaded successfully to request ${serviceQueueId}`,
                metadata: JSON.stringify({ 
                  requestId: newRequest[0].id,
                  fileName: file.name,
                  fileSize: uploadResult.fileSize 
                }),
              });

              await notificationService.createActivityLog({
                userId: currentUserId!,
                companyId: finalCompanyId,
                type: 'attachment_uploaded',
                description: `Uploaded file "${file.name}" (${(uploadResult.fileSize / 1024).toFixed(1)}KB) to new request ${serviceQueueId}`,
                requestId: newRequest[0].id,
                metadata: JSON.stringify({ 
                  fileName: file.name,
                  fileSize: uploadResult.fileSize,
                  mimeType: uploadResult.mimeType 
                }),
              });
            } catch (error) {
              console.error(`Failed to upload file ${file.name}:`, error);
            }
          }
        }
        
        console.log(`Uploaded ${uploadResults.length} files for request ${serviceQueueId}`);
      }

      return NextResponse.json({ 
        message: 'Service request created successfully',
        request: newRequest[0],
        assignedToId: finalAssignedToId
      });
    } catch (error) {
      console.error('Failed to create service request:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);