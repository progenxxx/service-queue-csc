import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { serviceRequests, companies, users, requestAttachments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { emailService } from '@/lib/email/sendgrid';
import { notificationService } from '@/lib/services/notification';
import { blobService } from '@/lib/services/blob';

const createRequestSchema = z.object({
  insured: z.string().min(1, 'Insured is required'),
  serviceRequestNarrative: z.string().min(1, 'Service request narrative is required'),
  serviceQueueCategory: z.string().min(1, 'Service queue category is required'),
  serviceQueueId: z.string().min(1, 'Service queue ID is required'),
  assignedById: z.string().min(1, 'Assigned by ID is required'),
  assignedToId: z.string().optional(),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
});

export const POST = requireRole(['agent_manager', 'super_admin'])(
  async (req: NextRequest) => {
    try {
      const formData = await req.formData();
      const currentUserId = req.headers.get('x-user-id');
      
      if (!currentUserId) {
        return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
      }

      // Extract form fields
      const requestData = {
        insured: formData.get('insured') as string,
        serviceRequestNarrative: formData.get('serviceRequestNarrative') as string,
        serviceQueueCategory: formData.get('serviceQueueCategory') as string,
        serviceQueueId: formData.get('serviceQueueId') as string,
        assignedById: formData.get('assignedById') as string,
        assignedToId: formData.get('assignedToId') as string,
        dueDate: formData.get('dueDate') as string || undefined,
        dueTime: formData.get('dueTime') as string || undefined,
      };

      // Validate the request data
      const validatedData = createRequestSchema.parse(requestData);


      // Verify the assigned by user exists (customer)
      const assignedByUser = await db.query.users.findFirst({
        where: eq(users.id, validatedData.assignedById),
      });

      if (!assignedByUser) {
        return NextResponse.json(
          { error: 'Invalid assigned by user ID' },
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
            { error: 'User must be associated with a company' },
            { status: 400 }
          );
        }
      }

      // Verify the assigned to user exists (agent) - only if assignedToId is provided
      let assignedToUser: typeof assignedByUser | null = null;
      if (validatedData.assignedToId) {
        assignedToUser = await db.query.users.findFirst({
          where: eq(users.id, validatedData.assignedToId),
        }) || null;

        if (!assignedToUser) {
          return NextResponse.json(
            { error: 'Invalid assigned to user ID' },
            { status: 400 }
          );
        }
      }

      // Create the service request
      const [newRequest] = await db.insert(serviceRequests).values({
        serviceQueueId: validatedData.serviceQueueId,
        insured: validatedData.insured,
        companyId: assignedByUser.companyId, // Use the company of the person assigning the request
        taskStatus: 'new',
        serviceRequestNarrative: validatedData.serviceRequestNarrative,
        serviceQueueCategory: validatedData.serviceQueueCategory as 'policy_inquiry' | 'claims_processing' | 'account_update' | 'technical_support' | 'billing_inquiry' | 'insured_service_cancel_non_renewal' | 'other',
        assignedToId: validatedData.assignedToId || null, // Agent who will handle the request
        assignedById: validatedData.assignedById, // Customer who assigned the request
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        dueTime: validatedData.dueTime || null,
        modifiedById: currentUserId,
      }).returning();

      // Handle file uploads
      const uploadedFiles = formData.getAll('files') as File[];
      if (uploadedFiles.length > 0) {
        const uploadResults: any[] = [];
        
        for (const file of uploadedFiles) {
          if (file.size > 0) {
            try {
              const uploadResult = await Promise.race([
                blobService.uploadFile({
                  requestId: newRequest.id,
                  file,
                  userId: currentUserId,
                }),
                new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
                )
              ]);

              const [attachment] = await db.insert(requestAttachments).values({
                requestId: newRequest.id,
                fileName: file.name,
                filePath: uploadResult.url,
                fileSize: uploadResult.fileSize,
                mimeType: uploadResult.mimeType,
                uploadedById: currentUserId,
              }).returning();

              uploadResults.push(attachment);

              // Use enhanced notification system for file uploads
              await notificationService.notifyAttachmentUploaded({
                requestId: newRequest.id,
                serviceQueueId: newRequest.serviceQueueId,
                uploaderId: currentUserId,
                companyId: assignedByUser.companyId,
                fileName: file.name,
                fileSize: uploadResult.fileSize,
              });
            } catch (error) {
              console.error(`Failed to upload file ${file.name}:`, error);
            }
          }
        }
        
        console.log(`Uploaded ${uploadResults.length} files for request ${newRequest.serviceQueueId}`);
      }

      // Get current agent user for notifications (since agent assigns to themselves)
      const currentAgent = await db.query.users.findFirst({
        where: eq(users.id, currentUserId),
      });

      // Send notifications using enhanced notification system
      try {
        // Use the enhanced notification system for request creation
        await notificationService.notifyRequestCreated({
          requestId: newRequest.id,
          serviceQueueId: newRequest.serviceQueueId,
          creatorId: currentUserId,
          companyId: assignedByUser.companyId,
          assignedToId: validatedData.assignedToId,
          insured: newRequest.insured,
          narrative: newRequest.serviceRequestNarrative,
          category: newRequest.serviceQueueCategory,
          priority: newRequest.dueDate ? 'high' : 'normal',
        });

        // If the request was assigned to someone specific, also send assignment notification
        if (validatedData.assignedToId && assignedToUser) {
          await notificationService.notifyRequestAssigned({
            requestId: newRequest.id,
            serviceQueueId: newRequest.serviceQueueId,
            assignerId: currentUserId,
            assignedToId: validatedData.assignedToId,
            companyId: assignedByUser.companyId,
            insured: newRequest.insured,
            narrative: newRequest.serviceRequestNarrative,
            dueDate: newRequest.dueDate?.toISOString(),
          });
        }
      } catch (notificationError) {
        console.error('Failed to send notifications:', notificationError);
        // Don't fail the request creation if notification fails
      }

      return NextResponse.json({
        success: true,
        request: {
          id: newRequest.id,
          serviceQueueId: newRequest.serviceQueueId,
          insured: newRequest.insured,
          serviceRequestNarrative: newRequest.serviceRequestNarrative,
          taskStatus: newRequest.taskStatus,
          createdAt: newRequest.createdAt,
        },
        message: `Service request "${newRequest.serviceQueueId}" has been created successfully.`
      });

    } catch (error) {
      console.error('Failed to create service request:', error);

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.issues },
          { status: 400 }
        );
      }

      if (error instanceof Error) {
        if (error.message.includes('duplicate key') || error.message.includes('UNIQUE constraint')) {
          return NextResponse.json(
            { error: 'A service request with this ID already exists' },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        { error: 'Failed to create service request. Please try again.' },
        { status: 500 }
      );
    }
  }
);