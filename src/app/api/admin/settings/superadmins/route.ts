import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const createSuperAdminSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const GET = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      const superAdmins = await db.query.users.findMany({
        where: eq(users.role, 'super_admin'),
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
          isActive: true,
        },
      });

      return NextResponse.json({ superAdmins });
    } catch (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

export const POST = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const validatedData = createSuperAdminSchema.parse(body);

      const emailExists = await db.query.users.findFirst({
        where: eq(users.email, validatedData.email),
        columns: { id: true },
      });

      if (emailExists) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(validatedData.password, 12);

      const newSuperAdmin = await db.insert(users).values({
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        passwordHash: hashedPassword,
        role: 'super_admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        isActive: users.isActive,
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Super admin created successfully',
        superAdmin: newSuperAdmin[0]
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
  }
);