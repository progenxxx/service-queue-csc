import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { serviceRequests, requestAttachments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { blobService } from '@/lib/services/blob';
import { notificationService } from '@/lib/services/notification';

export const POST = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');
      const requestId = pathParts[pathParts.length - 2];
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      const request = await db.query.serviceRequests.findFirst({
        where: eq(serviceRequests.id, requestId),
        with: {
          company: true
        }
      });

      if (!request) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }

      const formData = await req.formData();
      const files = formData.getAll('files') as File[];
      
      if (files.length === 0) {
        return NextResponse.json({ error: 'No files provided' }, { status: 400 });
      }

      const uploadResults: any[] = [];

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
              message: `File "${file.name}" uploaded successfully to request ${request.serviceQueueId}`,
              metadata: JSON.stringify({ 
                requestId,
                fileName: file.name,
                fileSize: uploadResult.fileSize 
              }),
            });

            await notificationService.createActivityLog({
              userId,
              companyId: request.companyId,
              type: 'attachment_uploaded',
              description: `Uploaded file "${file.name}" (${(uploadResult.fileSize / 1024).toFixed(1)}KB) to request ${request.serviceQueueId}`,
              requestId,
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

      return NextResponse.json({ 
        success: true,
        uploadedFiles: uploadResults.length,
        attachments: uploadResults
      });
    } catch (error) {
      console.error('Failed to upload files:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);