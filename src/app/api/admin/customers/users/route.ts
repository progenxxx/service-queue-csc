import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { generateLoginCode } from '@/lib/auth/utils-node';
import { emailService } from '@/lib/email/sendgrid';
import { notificationService } from '@/lib/services/notification';

const deleteUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
});

const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['customer', 'customer_admin']).default('customer'),
  customerId: z.string().min(1, 'Customer ID is required'),
});

export const GET = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url);
      const customerId = searchParams.get('customerId');

      if (!customerId) {
        return NextResponse.json(
          { error: 'Customer ID is required' },
          { status: 400 }
        );
      }

      const usersWithCompany = await db.query.users.findMany({
        where: eq(users.companyId, customerId),
        with: {
          company: {
            columns: {
              companyName: true,
              companyCode: true,
            },
          },
        },
        orderBy: users.createdAt,
      });

      return NextResponse.json({ 
        users: usersWithCompany.map(user => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          loginCode: user.loginCode, // Return the STORED login code from DB
          isActive: user.isActive,
          createdAt: user.createdAt,
          company: user.company,
        }))
      });
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

export const POST = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const validatedData = createUserSchema.parse(body);
      const currentUserId = req.headers.get('x-user-id');

      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, validatedData.email),
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 400 }
        );
      }

      const loginCode = generateLoginCode();

      const [newUser] = await db.insert(users).values({
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        loginCode,
        role: validatedData.role,
        companyId: validatedData.customerId,
        isActive: true,
      }).returning();

      try {
        const company = await db.query.companies.findFirst({
          where: eq(companies.id, validatedData.customerId),
        });

        if (company) {
          await emailService.sendCustomerWelcome(newUser.email, {
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            loginCode,
            companyName: company.companyName,
          });
        }

        if (currentUserId) {
          await notificationService.notifyUserCreated(currentUserId, {
            id: newUser.id,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            email: newUser.email,
            role: newUser.role,
            companyId: validatedData.customerId,
          });
        }
      } catch {}

      return NextResponse.json({ 
        success: true,
        user: {
          id: newUser.id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
          loginCode: newUser.loginCode,
          isActive: newUser.isActive,
        },
        message: `User "${newUser.firstName} ${newUser.lastName}" has been created successfully with login code ${loginCode}.`
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.issues },
          { status: 400 }
        );
      }

      if (error instanceof Error) {
        if (error.message.includes('duplicate key') || error.message.includes('UNIQUE constraint')) {
          return NextResponse.json(
            { error: 'A user with this email already exists' },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        { error: 'Failed to create user. Please try again.' },
        { status: 500 }
      );
    }
  }
);

export const DELETE = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      let body;
      try {
        body = await req.json();
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON in request body' },
          { status: 400 }
        );
      }

      let validatedData;
      try {
        validatedData = deleteUserSchema.parse(body);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return NextResponse.json(
            { error: 'Invalid request data', details: validationError.issues },
            { status: 400 }
          );
        }
        throw validationError;
      }

      const { userId, customerId } = validatedData;

      let existingUser;
      try {
        existingUser = await db.query.users.findFirst({
          where: and(
            eq(users.id, userId),
            eq(users.companyId, customerId)
          ),
        });
      } catch {
        return NextResponse.json(
          { error: 'Database error while searching for user' },
          { status: 500 }
        );
      }

      if (!existingUser) {
        return NextResponse.json(
          { error: 'User not found or does not belong to this customer' },
          { status: 404 }
        );
      }
      
      try {
        await db.delete(users).where(eq(users.id, userId));
      } catch {
        return NextResponse.json(
          { error: 'Failed to delete user from database' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        message: `User "${existingUser.firstName} ${existingUser.lastName}" has been deleted successfully.` 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      return NextResponse.json(
        { 
          error: 'Internal server error',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 500 }
      );
    }
  }
);
