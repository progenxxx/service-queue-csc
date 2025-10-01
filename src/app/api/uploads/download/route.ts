import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { requestAttachments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const GET = requireRole(['customer', 'customer_admin', 'agent', 'super_admin'])(
  async (req: NextRequest) => {
    try {
      const url = new URL(req.url);
      const requestId = url.searchParams.get('requestId');
      const fileName = url.searchParams.get('fileName');
      
      if (!requestId || !fileName) {
        return NextResponse.json({ error: 'Request ID and filename required' }, { status: 400 });
      }

      const attachment = await db.query.requestAttachments.findFirst({
        where: and(
          eq(requestAttachments.requestId, requestId),
          eq(requestAttachments.fileName, fileName)
        ),
      });

      if (!attachment) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      const response = await fetch(attachment.filePath);
      if (!response.ok) {
        return NextResponse.json({ error: 'File not accessible' }, { status: 404 });
      }

      const fileBuffer = await response.arrayBuffer();

      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          'Content-Type': attachment.mimeType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${attachment.fileName}"`,
        },
      });
    } catch (error) {
      console.error('Failed to download file:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);
