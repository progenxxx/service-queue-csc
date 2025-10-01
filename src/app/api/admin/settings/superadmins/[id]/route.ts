import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const DELETE = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      const url = new URL(req.url);
      const id = url.pathname.split('/').pop();
      
      if (!id) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
      }

      const currentUserId = req.headers.get('x-user-id');
      
      if (currentUserId === id) {
        return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
      }

      const userToDelete = await db.query.users.findFirst({
        where: eq(users.id, id),
        columns: {
          id: true,
          role: true,
        },
      });

      if (!userToDelete) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (userToDelete.role !== 'super_admin') {
        return NextResponse.json({ error: 'User is not a super admin' }, { status: 400 });
      }

      await db.delete(users).where(eq(users.id, id));

      return NextResponse.json({ 
        success: true, 
        message: 'Super admin deleted successfully' 
      });
    } catch (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);