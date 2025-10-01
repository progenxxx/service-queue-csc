import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { companies, users } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { z } from 'zod';
import { emailService } from '@/lib/email/sendgrid';

const updateDetailsSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  userId: z.string().optional(), // Add optional userId to specify which user to update
  companyName: z.string().min(1, 'Company name is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  loginCode: z.string().min(7, 'Login code must be at least 7 characters'),
  role: z.enum(['customer', 'customer_admin', 'agent']),
  forceEmailUpdate: z.boolean().optional().default(false),
});

export const POST = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      console.log('Starting update-details API call');
      
      const body = await req.json();
      console.log('Request body:', body);
      
      const validatedData = updateDetailsSchema.parse(body);
      console.log('Validated data:', validatedData);

      const existingCompany = await db.query.companies.findFirst({
        where: eq(companies.id, validatedData.customerId),
      });

      if (!existingCompany) {
        console.log('Company not found:', validatedData.customerId);
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }

      console.log('Found company:', existingCompany);

      // Find the specific user to update - either by userId or find first user in company
      const existingUser = validatedData.userId 
        ? await db.query.users.findFirst({
            where: eq(users.id, validatedData.userId),
          })
        : await db.query.users.findFirst({
            where: eq(users.companyId, validatedData.customerId),
          });

      console.log('Found existing user:', existingUser);

      // Check if email is already taken by another user (excluding current user if updating)
      if (!validatedData.forceEmailUpdate) {
        // Skip email validation if user is keeping their current email
        const isKeepingCurrentEmail = existingUser && existingUser.email === validatedData.email;
        
        console.log('Email validation check:');
        console.log('- Current user email:', existingUser?.email);
        console.log('- New email:', validatedData.email);
        console.log('- Is keeping current email:', isKeepingCurrentEmail);
        
        if (!isKeepingCurrentEmail) {
          const emailCheck = await db.query.users.findFirst({
            where: existingUser 
              ? and(eq(users.email, validatedData.email), ne(users.id, existingUser.id))
              : eq(users.email, validatedData.email),
          });

          if (emailCheck) {
            console.log('Email already exists for another user:', validatedData.email);
            console.log('Existing user with this email:', emailCheck);
            console.log('Current user ID:', existingUser?.id);
            console.log('Conflicting user ID:', emailCheck.id);
            
            // Double check that this is actually a different user
            if (existingUser && emailCheck.id === existingUser.id) {
              console.log('False positive - this is the same user, allowing update');
            } else {
              return NextResponse.json(
                { 
                  error: 'Email already exists',
                  details: `Email ${validatedData.email} is already in use by user: ${emailCheck.firstName} ${emailCheck.lastName} (ID: ${emailCheck.id})`,
                  conflictingUser: {
                    id: emailCheck.id,
                    name: `${emailCheck.firstName} ${emailCheck.lastName}`,
                    email: emailCheck.email,
                    role: emailCheck.role,
                    companyId: emailCheck.companyId
                  }
                },
                { status: 409 }
              );
            }
          }
        } else {
          console.log('User is keeping their current email - skipping email validation');
        }
      } else {
        console.log('Force email update enabled - skipping email uniqueness check');
        
        // If forcing update, we should handle the conflicting user
        const conflictingUser = await db.query.users.findFirst({
          where: existingUser 
            ? and(eq(users.email, validatedData.email), ne(users.id, existingUser.id))
            : eq(users.email, validatedData.email),
        });
        
        if (conflictingUser) {
          console.log('Will reassign email from conflicting user:', conflictingUser);
          // We'll handle this in the transaction below
        }
      }

      const result = await db.transaction(async (tx) => {
        try {
          await tx.update(companies)
            .set({
              companyName: validatedData.companyName,
              primaryContact: `${validatedData.firstName} ${validatedData.lastName}`,
              updatedAt: new Date(),
            })
            .where(eq(companies.id, validatedData.customerId));

        let userResult;
        
        if (existingUser) {
          console.log('About to update existing user with data:', {
            firstName: validatedData.firstName,
            lastName: validatedData.lastName,
            email: validatedData.email,
            loginCode: validatedData.loginCode,
            role: validatedData.role
          });
          
          userResult = await tx.update(users)
            .set({
              firstName: validatedData.firstName,
              lastName: validatedData.lastName,
              email: validatedData.email,
              loginCode: validatedData.loginCode,
              role: validatedData.role,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existingUser.id))
            .returning();

          console.log('Updated existing user successfully:', userResult);
        } else {
          userResult = await tx.insert(users).values({
            firstName: validatedData.firstName,
            lastName: validatedData.lastName,
            email: validatedData.email,
            loginCode: validatedData.loginCode,
            role: validatedData.role,
            companyId: validatedData.customerId,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }).returning();

          console.log('Created new user');
        }

          return { existingUser: !!existingUser, userResult };
        } catch (dbError) {
          console.error('Database transaction error:', dbError);
          if (dbError instanceof Error) {
            console.error('Error message:', dbError.message);
            console.error('Error stack:', dbError.stack);
          }
          throw dbError;
        }
      });

      try {
        if (result.existingUser) {
          await emailService.sendPasswordReset(validatedData.email, {
            firstName: validatedData.firstName,
            lastName: validatedData.lastName,
            resetToken: validatedData.loginCode,
            expirationTime: 'Never expires',
          });
          console.log('Sent password reset email');
        } else {
          if (validatedData.role === 'customer_admin') {
            await emailService.sendCustomerAdminWelcome(validatedData.email, {
              firstName: validatedData.firstName,
              lastName: validatedData.lastName,
              email: validatedData.email,
              loginCode: validatedData.loginCode,
              companyName: validatedData.companyName,
            });
            console.log('Sent customer admin welcome email');
          } else {
            await emailService.sendCustomerWelcome(validatedData.email, {
              firstName: validatedData.firstName,
              lastName: validatedData.lastName,
              loginCode: validatedData.loginCode,
              companyName: validatedData.companyName,
            });
            console.log('Sent customer welcome email');
          }
        }
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }

      console.log('Update completed successfully');
      return NextResponse.json({ 
        success: true, 
        message: 'Customer details updated successfully'
      });

    } catch (error) {
      console.error('API Error:', error);
      
      if (error instanceof z.ZodError) {
        console.log('Validation error:', error.issues);
        return NextResponse.json(
          { error: 'Invalid request data', details: error.issues },
          { status: 400 }
        );
      }

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

      return NextResponse.json(
        { error: 'Unknown error occurred' }, 
        { status: 500 }
      );
    }
  }
);