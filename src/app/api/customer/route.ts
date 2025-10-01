import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { serviceRequests, companies, users, requestNotes, agents, requestAttachments } from '@/lib/db/schema';
import { desc, eq, and, inArray } from 'drizzle-orm';
import { emailService } from '@/lib/email/sendgrid';
import { blobService } from '@/lib/services/blob';
import { notificationService } from '@/lib/services/notification';

function generateServiceQueueId(): string {
  const prefix = 'ServQUE';
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

export const GET = requireRole(['customer', 'customer_admin'])(
  async (request: NextRequest) => {
    try {
      const currentUserCompanyId = request.headers.get('x-company-id');
      
      if (!currentUserCompanyId) {
        return NextResponse.json({ error: 'Company ID not found' }, { status: 400 });
      }

      // Fetch users from the same company (only customer roles)
      const companyUsers = await db.query.users.findMany({
        where: and(
          eq(users.companyId, currentUserCompanyId),
          inArray(users.role, ['customer', 'customer_admin'])
        ),
        with: {
          company: {
            columns: {
              companyName: true,
            },
          },
        },
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          companyId: true,
        },
      });

      return NextResponse.json({ users: companyUsers });
    } catch {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

export const POST = requireRole(['super_admin', 'customer_admin', 'customer'])(
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
      const companyId = formData.get('companyId') as string;

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

      // Verify the assigned by user exists and is a customer
      const assignedByUser = await db.query.users.findFirst({
        where: eq(users.id, assignedByIdRaw),
      });

      if (!assignedByUser) {
        return NextResponse.json(
          { error: 'Invalid assigned by user' },
          { status: 400 }
        );
      }

      // Assigned by should be a customer from the same company
      if (currentUserRole !== 'super_admin' && assignedByUser.companyId !== currentUserCompanyId) {
        return NextResponse.json(
          { error: 'Can only assign requests from your own company' },
          { status: 403 }
        );
      }

      let finalCompanyId = companyId;
      if (currentUserRole !== 'super_admin' && currentUserCompanyId) {
        finalCompanyId = currentUserCompanyId;
      }

      if (!finalCompanyId) {
        return NextResponse.json(
          { error: 'Company selection is required' },
          { status: 400 }
        );
      }

      const dueDate = dueDateStr ? new Date(dueDateStr) : null;

      // For customer requests, leave assignedToId as null (unassigned)
      // Agents can later pick up these requests
      const assignedToId: string | null = null;

      const insertData: any = {
        serviceQueueId,
        insured,
        companyId: finalCompanyId,
        serviceRequestNarrative,
        serviceQueueCategory: serviceQueueCategory as 'policy_inquiry' | 'claims_processing' | 'account_update' | 'technical_support' | 'billing_inquiry' | 'insured_service_cancel_non_renewal' | 'other',
        assignedById: assignedByIdRaw, // Customer who assigned the request
        taskStatus: 'new',
        modifiedById: currentUserId,
      };

      // Only include assignedToId if it has a value
      if (assignedToId) {
        insertData.assignedToId = assignedToId;
      }

      // Only include dueDate if it has a value
      if (dueDate) {
        insertData.dueDate = dueDate;
      }

      // Only include dueTime if it has a value
      if (dueTimeStr) {
        insertData.dueTime = dueTimeStr;
      }

      const newRequest = await db.insert(serviceRequests).values(insertData).returning();

      // Create activity log for request creation
      if (currentUserId) {
        await notificationService.createActivityLog({
          userId: currentUserId,
          companyId: finalCompanyId,
          type: 'request_created',
          description: `Created new service request ${serviceQueueId} for insured "${insured}"`,
          requestId: newRequest[0].id,
          metadata: JSON.stringify({
            serviceQueueCategory,
            assignedById: assignedByIdRaw,
            dueDate: dueDateStr || null
          }),
        });
      }

      // Send confirmation email to the customer who created the request
      try {
        const requestCreator = await db.query.users.findFirst({
          where: eq(users.id, assignedByIdRaw),
          columns: {
            firstName: true,
            lastName: true,
            email: true,
          },
        });

        if (requestCreator?.email) {
          await emailService.sendNewRequest(requestCreator.email, {
            requestId: newRequest[0].id,
            serviceQueueId: newRequest[0].serviceQueueId,
            clientName: insured,
            requestTitle: serviceRequestNarrative,
            category: serviceQueueCategory,
            createdBy: `${requestCreator.firstName} ${requestCreator.lastName}`,
            priority: dueDate ? 'High' : 'Normal',
            userType: 'customer',
          });
        }
      } catch(err) {
        console.log(err)
      }

      // Handle file uploads
      const files = formData.getAll('files') as File[];
      if (files.length > 0) {
        const uploadResults: any[] = [];
        
        for (const file of files) {
          if (file.size > 0) {
            try {
              const uploadResult = await Promise.race([
                blobService.uploadFile({
                  requestId: newRequest[0].id,
                  file,
                  userId: currentUserId,
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
                uploadedById: currentUserId,
              }).returning();

              uploadResults.push(attachment);

              await notificationService.createNotification({
                userId: currentUserId,
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
                userId: currentUserId,
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
        status: 'Created and awaiting agent assignment'
      });
    } catch(err) {
      console.error('Service request creation error:', err);
      
      // Check for specific database errors
      if (err instanceof Error) {
        if (err.message.includes('duplicate key') || err.message.includes('unique constraint')) {
          return NextResponse.json({ error: 'Service queue ID already exists. Please try again.' }, { status: 400 });
        }
        if (err.message.includes('foreign key')) {
          return NextResponse.json({ error: 'Invalid reference data provided.' }, { status: 400 });
        }
      }
      
      return NextResponse.json({ 
        error: 'Failed to create service request. Please try again.',
        details: err instanceof Error ? err.message : 'Unknown error'
      }, { status: 500 });
    }
  }
);
