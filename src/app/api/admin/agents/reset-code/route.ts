import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { users, agents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { generateLoginCode } from '@/lib/auth/utils-node';
import { emailService } from '@/lib/email/sendgrid';

const resetCodeSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
});

export const POST = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const validatedData = resetCodeSchema.parse(body);
      const { agentId } = validatedData;

      const existingAgent = await db.query.agents.findFirst({
        where: eq(agents.id, agentId),
        with: {
          user: true,
        },
      });

      if (!existingAgent) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        );
      }

      const newLoginCode = generateLoginCode();
      const oldLoginCode = existingAgent.user.loginCode;

      await db.update(users)
        .set({
          loginCode: newLoginCode,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingAgent.user.id));

      try {
        await emailService.sendAgentCodeReset(existingAgent.user.email, {
          firstName: existingAgent.user.firstName,
          lastName: existingAgent.user.lastName,
          oldLoginCode: oldLoginCode || '',
          newLoginCode: newLoginCode,
        });
      } catch (emailError) {
        console.error('Failed to send agent code reset email:', emailError);
      }

      return NextResponse.json({ 
        success: true, 
        newLoginCode: newLoginCode,
        oldLoginCode: oldLoginCode,
        message: `Login code for agent "${existingAgent.user.firstName} ${existingAgent.user.lastName}" has been reset successfully! New code ${newLoginCode} has been sent to ${existingAgent.user.email}.`
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.issues },
          { status: 400 }
        );
      }

      console.error('Failed to reset agent code:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);