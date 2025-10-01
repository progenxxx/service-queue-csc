import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { subTasks, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { notificationService } from '@/lib/services/notification';

// GET - Fetch subtasks for a request
export const GET = requireRole(['agent', 'agent_manager'])(
  async (req: NextRequest) => {
    try {
      const url = new URL(req.url);
      const requestId = url.searchParams.get('requestId');

      if (!requestId) {
        return NextResponse.json({ error: 'Request ID required' }, { status: 400 });
      }

      const tasks = await db.query.subTasks.findMany({
        where: eq(subTasks.requestId, requestId),
        with: {
          assignedTo: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignedBy: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: (subTasks, { desc }) => [desc(subTasks.createdAt)],
      });

      return NextResponse.json({ tasks });
    } catch (error) {
      console.error('Failed to fetch subtasks:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

// POST - Create a new subtask (agent managers only)
export const POST = requireRole(['agent_manager'])(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      const formData = await req.formData();

      const requestId = formData.get('requestId') as string;
      const taskDescription = formData.get('taskDescription') as string;
      const assignedToId = formData.get('assignedToId') as string;
      const dueDate = formData.get('dueDate') as string;

      if (!requestId || !taskDescription || !assignedToId || !userId) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Generate task ID
      const taskId = `TASK-${Date.now()}`;

      // Create the subtask
      const [subtask] = await db.insert(subTasks).values({
        taskId,
        requestId,
        taskDescription,
        assignedToId,
        assignedById: userId,
        dueDate: dueDate ? new Date(dueDate) : null,
        taskStatus: 'new',
      }).returning();

      // Send notification to assigned agent
      await notificationService.createNotification({
        userId: assignedToId,
        title: 'New Subtask Assigned',
        message: `You have been assigned a new subtask: ${taskDescription}`,
        type: 'subtask_assigned',
        metadata: JSON.stringify({
          subtaskId: subtask.id,
          requestId,
          taskId,
        }),
      });

      return NextResponse.json({
        success: true,
        message: 'Subtask created successfully',
        subtask
      });
    } catch (error) {
      console.error('Failed to create subtask:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

// PUT - Update a subtask
export const PUT = requireRole(['agent', 'agent_manager'])(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      const userRole = req.headers.get('x-user-role');
      const formData = await req.formData();

      const subtaskId = formData.get('subtaskId') as string;
      const taskStatus = formData.get('taskStatus') as string;
      const taskDescription = formData.get('taskDescription') as string;
      const assignedToId = formData.get('assignedToId') as string;
      const dueDate = formData.get('dueDate') as string;

      if (!subtaskId) {
        return NextResponse.json({ error: 'Subtask ID required' }, { status: 400 });
      }

      // Get existing subtask
      const existingSubtask = await db.query.subTasks.findFirst({
        where: eq(subTasks.id, subtaskId),
        with: {
          assignedBy: true,
        },
      });

      if (!existingSubtask) {
        return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
      }

      const updateData: any = {};

      // Agent managers can update all fields
      if (userRole === 'agent_manager') {
        if (taskDescription) updateData.taskDescription = taskDescription;
        if (assignedToId) updateData.assignedToId = assignedToId;
        if (dueDate) updateData.dueDate = new Date(dueDate);
        if (taskStatus) updateData.taskStatus = taskStatus;
      }
      // Regular agents can only update status
      else if (userRole === 'agent') {
        if (taskStatus) updateData.taskStatus = taskStatus;
      }

      await db.update(subTasks)
        .set(updateData)
        .where(eq(subTasks.id, subtaskId));

      // If subtask is completed, notify the manager who created it
      if (taskStatus === 'closed' && existingSubtask.taskStatus !== 'closed') {
        await notificationService.notifySubtaskCompleted({
          subtaskId,
          managerId: existingSubtask.assignedById,
          agentId: userId!,
          taskDescription: existingSubtask.taskDescription,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Subtask updated successfully'
      });
    } catch (error) {
      console.error('Failed to update subtask:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);
