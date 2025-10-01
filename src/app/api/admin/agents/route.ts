import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { users, agents, companies } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { generateLoginCode } from '@/lib/auth/utils-node';

const createAgentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  assignedCompanyIds: z.array(z.string()).optional().default([]),
});

const updateAgentSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  loginCode: z.string().min(1, 'Login code is required').max(7, 'Login code must be at most 7 characters'),
  assignedCompanyIds: z.array(z.string()).optional().default([]),
});

const deleteAgentSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
});

type CompanyData = {
  id: string;
  companyName: string;
};

export const GET = requireRole(['super_admin'])(async () => {
  try {
    const agentsWithDetails = await db.query.agents.findMany({
      with: {
        user: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            loginCode: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: (agents, { desc }) => [desc(agents.createdAt)],
    });

    const agentsWithCompanies = await Promise.all(
      agentsWithDetails.map(async (agent) => {
        let assignedCompanies: CompanyData[] = [];

        if (agent.assignedCompanyIds && agent.assignedCompanyIds.length > 0) {
          assignedCompanies = await db.query.companies.findMany({
            where: inArray(companies.id, agent.assignedCompanyIds),
            columns: {
              id: true,
              companyName: true,
            },
          });
        }

        return {
          id: agent.user.id,
          agentId: agent.id,
          firstName: agent.user.firstName,
          lastName: agent.user.lastName,
          email: agent.user.email,
          loginCode: agent.user.loginCode,
          assignedCompanyIds: agent.assignedCompanyIds || [],
          isActive: agent.user.isActive,
          createdAt: agent.user.createdAt,
          assignedCompanies,
        };
      })
    );

    return NextResponse.json({ agents: agentsWithCompanies });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = requireRole(['super_admin'])(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const validatedData = createAgentSchema.parse(body);

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, validatedData.email),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    let loginCode = generateLoginCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existingCode = await db.query.users.findFirst({
        where: eq(users.loginCode, loginCode),
      });

      if (!existingCode) {
        break;
      }

      loginCode = generateLoginCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Unable to generate unique login code. Please try again.' },
        { status: 500 }
      );
    }

    const [newUser] = await db
      .insert(users)
      .values({
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        loginCode,
        role: 'agent',
        isActive: true,
      })
      .returning();

    const [newAgent] = await db
      .insert(agents)
      .values({
        userId: newUser.id,
        assignedCompanyIds: validatedData.assignedCompanyIds,
        isActive: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      agent: {
        id: newAgent.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        loginCode: newUser.loginCode,
        assignedCompanyIds: newAgent.assignedCompanyIds || [],
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
      },
      message: `Agent "${newUser.firstName} ${newUser.lastName}" created successfully with login code: ${loginCode}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const PUT = requireRole(['super_admin'])(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const validatedData = updateAgentSchema.parse(body);

    const existingAgent = await db.query.agents.findFirst({
      where: eq(agents.id, validatedData.agentId),
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

    await db.update(users)
      .set({
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        loginCode: validatedData.loginCode,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingAgent.user.id));

    await db.update(agents)
      .set({
        assignedCompanyIds: validatedData.assignedCompanyIds,
        updatedAt: new Date(),
      })
      .where(eq(agents.id, validatedData.agentId));

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

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = requireRole(['super_admin'])(async (req: NextRequest) => {
  try {
    const body = await req.json();
    const validatedData = deleteAgentSchema.parse(body);

    const existingAgent = await db.query.agents.findFirst({
      where: eq(agents.id, validatedData.agentId),
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

    await db.delete(agents).where(eq(agents.id, validatedData.agentId));
    
    await db.delete(users).where(eq(users.id, existingAgent.user.id));

    return NextResponse.json({
      success: true,
      message: `Agent "${existingAgent.user.firstName} ${existingAgent.user.lastName}" deleted successfully`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});