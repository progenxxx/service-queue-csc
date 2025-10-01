import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { serviceRequests, requestNotes, requestAttachments } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export const GET = requireRole(['super_admin'])(
  async () => {
    try {
      const recentRequests = await db.query.serviceRequests.findMany({
        with: {
          assignedBy: {
            columns: {
              firstName: true,
              lastName: true,
            },
          },
          company: {
            columns: {
              companyName: true,
            },
          },
        },
        orderBy: [desc(serviceRequests.createdAt)],
        limit: 5,
      });

      const recentNotes = await db.query.requestNotes.findMany({
        with: {
          author: {
            columns: {
              firstName: true,
              lastName: true,
            },
          },
          request: {
            columns: {
              serviceQueueId: true,
              insured: true,
            },
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
        limit: 3,
      });

      const recentAttachments = await db.query.requestAttachments.findMany({
        with: {
          uploadedBy: {
            columns: {
              firstName: true,
              lastName: true,
            },
          },
          request: {
            columns: {
              serviceQueueId: true,
              insured: true,
            },
            with: {
              company: {
                columns: {
                  companyName: true,
                },
              },
            },
          },
        },
        orderBy: [desc(requestAttachments.createdAt)],
        limit: 2,
      });

      const activities = [
        ...recentRequests.map(request => ({
          id: request.id,
          type: 'request_created',
          description: `New service request created for ${request.insured}`,
          timestamp: new Date(request.createdAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
          user: request.assignedBy,
          company: request.company,
        })),
        ...recentNotes.map(note => ({
          id: note.id,
          type: 'note_added',
          description: `Added note to request ${note.request?.serviceQueueId || 'Unknown'}`,
          timestamp: new Date(note.createdAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
          user: note.author,
          company: note.request?.company,
        })),
        ...recentAttachments.map(attachment => ({
          id: attachment.id,
          type: 'attachment_uploaded',
          description: `Uploaded ${attachment.fileName} to request ${attachment.request?.serviceQueueId || 'Unknown'}`,
          timestamp: new Date(attachment.createdAt).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
          user: attachment.uploadedBy,
          company: attachment.request?.company,
        })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
       .slice(0, 10);

      return NextResponse.json({ activities });
    } catch (error) {
      console.error('Failed to fetch activity:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);