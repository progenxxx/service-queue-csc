import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { serviceRequests, requestAttachments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { blobService } from '@/lib/services/blob';
import { notificationService } from '@/lib/services/notification';

export const runtime = 'nodejs';
export const maxDuration = 60;

export const POST = requireRole(['customer', 'customer_admin'])(
  async (req: NextRequest) => {
    try {
      const companyId = req.headers.get('x-company-id');
      const userId = req.headers.get('x-user-id');
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');
      const requestId = pathParts[pathParts.length - 2];
      
      if (!companyId || !userId) {
        return NextResponse.json({ error: 'Company ID and User ID required' }, { status: 400 });
      }

      const request = await db.query.serviceRequests.findFirst({
        where: and(
          eq(serviceRequests.id, requestId),
          eq(serviceRequests.companyId, companyId)
        ),
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

      console.log(`Processing ${files.length} file uploads...`);
      files.forEach((file, index) => {
        console.log(`File: ${file.name}, Size: ${file.size}, Type: ${file.type}`);
      });

      for (const file of files) {
        if (file.size > 0) {
          try {
            console.log(`About to upload file: ${file.name} (${file.size} bytes)`);
            console.log('Request ID:', requestId);
            console.log('User ID:', userId);
            
            const uploadResult = await Promise.race([
              blobService.uploadFile({
                requestId,
                file,
                userId,
              }),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
              )
            ]);
            console.log('Upload result:', uploadResult);

            const [attachment] = await db.insert(requestAttachments).values({
              requestId,
              fileName: file.name,
              filePath: uploadResult.url,
              fileSize: uploadResult.fileSize,
              mimeType: uploadResult.mimeType,
              uploadedById: userId,
            }).returning();

            console.log('Database insertion successful:', attachment);
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
              companyId,
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
            console.error('Error details:', {
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              errorStack: error instanceof Error ? error.stack : undefined,
              fileName: file.name,
              fileSize: file.size
            });
          }
        }
      }

      console.log('Upload process completed:', {
        totalFilesProcessed: files.length,
        successfulUploads: uploadResults.length,
        uploadResults
      });

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