import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateDetailsSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
});

export const GET = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({ user });
    } catch (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

export const PUT = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      const userId = req.headers.get('x-user-id');
      
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      const body = await req.json();
      const validatedData = updateDetailsSchema.parse(body);

      const existingUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          email: true,
        },
      });

      if (!existingUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (validatedData.email !== existingUser.email) {
        const emailExists = await db.query.users.findFirst({
          where: eq(users.email, validatedData.email),
          columns: { id: true },
        });

        if (emailExists) {
          return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
        }
      }

      await db.update(users)
        .set({
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          email: validatedData.email,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return NextResponse.json({ 
        success: true, 
        message: 'Account details updated successfully' 
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