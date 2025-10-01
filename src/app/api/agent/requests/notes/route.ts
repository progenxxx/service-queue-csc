import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { requestNotes, serviceRequests, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { emailService } from '@/lib/email/sendgrid';
import { notificationService } from '@/lib/services/notification';

const createNoteSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  noteContent: z.string().min(1, 'Note content is required'),
  recipientEmail: z.string().email('Valid email address is required').optional(),
  isInternal: z.boolean().optional().default(false),
});

export const POST = requireRole(['agent', 'agent_manager'])(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      const body = await req.json();
      const validatedData = createNoteSchema.parse(body);

      // Verify the request exists (agents can access any request)
      const request = await db.query.serviceRequests.findFirst({
        where: eq(serviceRequests.id, validatedData.requestId),
        with: {
          assignedTo: true,
          assignedBy: true,
          company: true,
        },
      });

      if (!request) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }

      const [newNote] = await db.insert(requestNotes).values({
        requestId: validatedData.requestId,
        authorId: userId,
        noteContent: validatedData.noteContent,
        isInternal: validatedData.isInternal,
      }).returning();

      const noteAuthor = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          firstName: true,
          lastName: true,
        },
      });

      // Use enhanced notification system for note addition
      if (noteAuthor) {
        await notificationService.notifyNoteAdded({
          requestId: validatedData.requestId,
          serviceQueueId: request.serviceQueueId,
          authorId: userId,
          companyId: request.companyId,
          content: validatedData.noteContent,
          recipientEmail: validatedData.recipientEmail,
          isInternal: validatedData.isInternal,
        });
      }

      return NextResponse.json({
        success: true,
        note: newNote
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.issues },
          { status: 400 }
        );
      }

      console.error('Failed to create note:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);