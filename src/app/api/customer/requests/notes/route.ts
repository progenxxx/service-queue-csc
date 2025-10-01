import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { requestNotes, serviceRequests, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { emailService } from '@/lib/email/sendgrid';

const createNoteSchema = z.object({
  requestId: z.string().min(1, 'Request ID is required'),
  noteContent: z.string().min(1, 'Note content is required'),
  recipientEmail: z.string().email('Valid email address is required').optional(),
  isInternal: z.boolean().optional().default(false),
});

export const POST = requireRole(['customer', 'customer_admin', 'agent'])(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      const companyId = req.headers.get('x-company-id');
      const userRole = req.headers.get('x-user-role');
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      const body = await req.json();
      const validatedData = createNoteSchema.parse(body);

      let whereClause;
      if (userRole === 'agent') {
        whereClause = eq(serviceRequests.id, validatedData.requestId);
      } else {
        if (!companyId) {
          return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        }
        whereClause = and(
          eq(serviceRequests.id, validatedData.requestId),
          eq(serviceRequests.companyId, companyId)
        );
      }

      const request = await db.query.serviceRequests.findFirst({
        where: whereClause,
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

      const emailRecipient = validatedData.recipientEmail || (request.assignedTo && request.assignedTo.email);
      if (emailRecipient && noteAuthor) {
        try {
          await emailService.sendNoteAdded(emailRecipient, {
            requestId: request.id,
            serviceQueueId: request.serviceQueueId,
            noteContent: validatedData.noteContent,
            authorName: `${noteAuthor.firstName} ${noteAuthor.lastName}`,
            clientName: request.insured,
            requestTitle: request.serviceRequestNarrative,
            userType: 'customer',
          });
        } catch {
          // Email sending failed but note creation succeeded
        }
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