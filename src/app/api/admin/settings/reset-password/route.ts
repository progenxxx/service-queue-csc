import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, hashPassword } from '@/lib/auth/utils-node';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
  targetUserId: z.string().optional(),
});

export const POST = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      const currentUserId = req.headers.get('x-user-id');
      
      if (!currentUserId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }

      const body = await req.json();
      const validatedData = resetPasswordSchema.parse(body);

      // Use targetUserId if provided (admin managing another user), otherwise use currentUserId (admin managing self)
      const targetUserId = validatedData.targetUserId || currentUserId;

      const user = await db.query.users.findFirst({
        where: eq(users.id, targetUserId),
        columns: {
          id: true,
          passwordHash: true,
          role: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (!user.passwordHash) {
        return NextResponse.json({ error: 'No password set for this user' }, { status: 400 });
      }

      const isCurrentPasswordValid = await verifyPassword(validatedData.currentPassword, user.passwordHash);
      
      if (!isCurrentPasswordValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      const newPasswordHash = await hashPassword(validatedData.newPassword);

      await db.update(users)
        .set({
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, targetUserId));

      return NextResponse.json({ 
        success: true, 
        message: 'Password updated successfully' 
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