import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { users, agents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateAgentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  loginCode: z.string().min(7, 'Login code must be at least 7 characters'),
  assignedCompanyIds: z.array(z.string()).optional().default([]),
});

export const PUT = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');
      const agentId = pathParts[pathParts.length - 1];

      const body = await req.json();
      const validatedData = updateAgentSchema.parse(body);

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

      if (validatedData.email !== existingAgent.user.email) {
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, validatedData.email),
        });

        if (existingUser && existingUser.id !== existingAgent.user.id) {
          return NextResponse.json(
            { error: 'A user with this email already exists' },
            { status: 400 }
          );
        }
      }

      if (validatedData.loginCode !== existingAgent.user.loginCode) {
        const existingCode = await db.query.users.findFirst({
          where: eq(users.loginCode, validatedData.loginCode),
        });

        if (existingCode && existingCode.id !== existingAgent.user.id) {
          return NextResponse.json(
            { error: 'This login code is already in use' },
            { status: 400 }
          );
        }
      }

      console.log('About to update agent user with data:', {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        loginCode: validatedData.loginCode
      });
      
      await db.update(users)
        .set({
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          email: validatedData.email,
          loginCode: validatedData.loginCode,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingAgent.user.id));
        
      console.log('Agent user updated successfully');

      await db.update(agents)
        .set({
          assignedCompanyIds: validatedData.assignedCompanyIds,
          updatedAt: new Date(),
        })
        .where(eq(agents.id, agentId));

      return NextResponse.json({
        success: true,
        message: `Agent "${validatedData.firstName} ${validatedData.lastName}" updated successfully`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.issues },
          { status: 400 }
        );
      }

      console.error('Failed to update agent:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        const isDev = process.env.NODE_ENV === 'development';
        return NextResponse.json(
          { 
            error: 'Internal server error',
            ...(isDev && { 
              message: error.message,
              stack: error.stack 
            })
          }, 
          { status: 500 }
        );
      }

      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

export const DELETE = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');
      const agentId = pathParts[pathParts.length - 1];

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

      await db.delete(agents).where(eq(agents.id, agentId));
      
      await db.delete(users).where(eq(users.id, existingAgent.user.id));

      return NextResponse.json({
        success: true,
        message: `Agent "${existingAgent.user.firstName} ${existingAgent.user.lastName}" deleted successfully`,
      });
    } catch (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);