import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { requestAttachments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { blobService } from '@/lib/services/blob';

export const DELETE = requireRole(['customer', 'customer_admin', 'agent', 'super_admin'])(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      const { searchParams } = new URL(req.url);
      const attachmentId = searchParams.get('attachmentId');
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      if (!attachmentId) {
        return NextResponse.json({ error: 'Attachment ID required' }, { status: 400 });
      }

      const attachment = await db.query.requestAttachments.findFirst({
        where: eq(requestAttachments.id, attachmentId),
      });

      if (!attachment) {
        return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
      }

      try {
        await blobService.deleteFile(attachment.filePath);
      } catch (error) {
        console.error('Failed to delete file from blob storage:', error);
      }

      await db.delete(requestAttachments).where(eq(requestAttachments.id, attachmentId));

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);