import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { serviceRequests, requestAttachments } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { generateServiceQueueId } from '@/lib/auth/utils-node';
import { blobService } from '@/lib/services/blob';
import { notificationService } from '@/lib/services/notification';

const createRequestSchema = z.object({
  insured: z.string().min(1, 'Insured name is required'),
  serviceRequestNarrative: z.string().min(1, 'Service request narrative is required'),
  serviceQueueCategory: z.enum(['policy_inquiry', 'claims_processing', 'account_update', 'technical_support', 'billing_inquiry', 'other']),
  dueDate: z.string().optional(),
  dueTime: z.string().optional(),
});

export const GET = requireRole(['customer', 'customer_admin'])(
  async (req: NextRequest) => {
    try {
      const companyId = req.headers.get('x-company-id');
      
      if (!companyId) {
        return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
      }

      const requests = await db.query.serviceRequests.findMany({
        where: eq(serviceRequests.companyId, companyId),
        with: {
          assignedTo: {
            columns: {
              firstName: true,
              lastName: true,
            },
          },
          assignedBy: {
            columns: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: [desc(serviceRequests.createdAt)],
      });

      return NextResponse.json({ requests });
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

export const POST = requireRole(['customer', 'customer_admin'])(
  async (req: NextRequest) => {
    try {
      const companyId = req.headers.get('x-company-id');
      const userId = req.headers.get('x-user-id');
      
      if (!companyId || !userId) {
        return NextResponse.json({ error: 'Company ID and User ID required' }, { status: 400 });
      }

      const formData = await req.formData();
      
      const requestData = {
        insured: formData.get('insured') as string,
        serviceRequestNarrative: formData.get('serviceRequestNarrative') as string,
        serviceQueueCategory: formData.get('serviceQueueCategory') as string,
        dueDate: formData.get('dueDate') as string || undefined,
        dueTime: formData.get('dueTime') as string || undefined,
      };

      const validatedData = createRequestSchema.parse(requestData);

      const serviceQueueId = generateServiceQueueId();

      const [newRequest] = await db.insert(serviceRequests).values({
        serviceQueueId,
        insured: validatedData.insured,
        companyId,
        serviceRequestNarrative: validatedData.serviceRequestNarrative,
        serviceQueueCategory: validatedData.serviceQueueCategory as 'policy_inquiry' | 'claims_processing' | 'account_update' | 'technical_support' | 'billing_inquiry' | 'other',
        assignedById: userId,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
        dueTime: validatedData.dueTime || null,
        taskStatus: 'new',
      }).returning();

      const files = formData.getAll('files') as File[];
      
      if (files.length > 0) {
        for (const file of files) {
          if (file.size > 0) {
            try {
              const uploadResult = await blobService.uploadFile({
                requestId: newRequest.id,
                file,
                userId,
              });

              await db.insert(requestAttachments).values({
                requestId: newRequest.id,
                fileName: file.name,
                filePath: uploadResult.url,
                fileSize: uploadResult.fileSize,
                mimeType: uploadResult.mimeType,
                uploadedById: userId,
              });

              await notificationService.createNotification({
                userId,
                type: 'attachment_uploaded',
                title: 'File Uploaded',
                message: `File "${file.name}" uploaded successfully to request ${serviceQueueId}`,
                metadata: JSON.stringify({ 
                  requestId: newRequest.id, 
                  fileName: file.name,
                  fileSize: uploadResult.fileSize 
                }),
              });

              await notificationService.createActivityLog({
                userId,
                companyId,
                type: 'attachment_uploaded',
                description: `Uploaded file "${file.name}" (${(uploadResult.fileSize / 1024).toFixed(1)}KB) to request ${serviceQueueId}`,
                requestId: newRequest.id,
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
      }

      return NextResponse.json({ 
        success: true, 
        request: {
          ...newRequest,
          serviceQueueId,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.issues },
          { status: 400 }
        );
      }

      console.error('Failed to create request:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);