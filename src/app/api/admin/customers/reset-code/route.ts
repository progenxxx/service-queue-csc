import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { companies, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { generateCompanyCode } from '@/lib/auth/utils-node';
import { emailService } from '@/lib/email/sendgrid';

const resetCodeSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
});

export const POST = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      console.log('Reset code API called');
      
      const body = await req.json();
      console.log('Request body:', body);
      
      const validatedData = resetCodeSchema.parse(body);
      const { customerId } = validatedData;
      console.log('Customer ID:', customerId);

      const existingCustomer = await db.query.companies.findFirst({
        where: eq(companies.id, customerId),
        with: {
          users: {
            where: eq(users.role, 'customer_admin'),
          },
        },
      });

      console.log('Found customer:', existingCustomer ? 'Yes' : 'No');
      
      if (!existingCustomer) {
        console.log('Customer not found with ID:', customerId);
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }

      let newCompanyCode = generateCompanyCode();
      let codeExists = true;
      let attempts = 0;
      const maxAttempts = 10;
      
      console.log('Generating new company code...');
      
      while (codeExists && attempts < maxAttempts) {
        const existingCode = await db.query.companies.findFirst({
          where: eq(companies.companyCode, newCompanyCode),
        });
        
        if (!existingCode) {
          codeExists = false;
          console.log('Generated unique code:', newCompanyCode);
        } else {
          newCompanyCode = generateCompanyCode();
          attempts++;
          console.log(`Code exists, trying again (attempt ${attempts}):`, newCompanyCode);
        }
      }

      if (attempts >= maxAttempts) {
        console.log('Max attempts reached for code generation');
        return NextResponse.json(
          { error: 'Unable to generate unique company code. Please try again.' },
          { status: 500 }
        );
      }

      const oldCompanyCode = existingCustomer.companyCode;
      console.log('Old company code:', oldCompanyCode);
      console.log('New company code:', newCompanyCode);

      console.log('Updating companies table...');
      
      const companyUpdateResult = await db.update(companies)
        .set({
          companyCode: newCompanyCode,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, customerId))
        .returning({ id: companies.id, companyCode: companies.companyCode });

      console.log('Company update result:', companyUpdateResult);

      console.log('Checking existing users...');
      console.log('Existing users count:', existingCustomer.users?.length || 0);

      if (existingCustomer.users && existingCustomer.users.length > 0) {
        console.log('Updating existing users...');
        
        const userUpdateResult = await db.update(users)
          .set({
            loginCode: newCompanyCode,
            updatedAt: new Date(),
          })
          .where(eq(users.companyId, customerId))
          .returning({ id: users.id, loginCode: users.loginCode });

        console.log('User update result:', userUpdateResult);
      } else {
        console.log('Creating new user...');
        
        const nameParts = existingCustomer.primaryContact.split(' ');
        const firstName = nameParts[0] || existingCustomer.primaryContact;
        const lastName = nameParts.slice(1).join(' ') || '';

        console.log('New user details:', { firstName, lastName, email: existingCustomer.email });

        const newUserResult = await db.insert(users).values({
          firstName: firstName,
          lastName: lastName,
          email: existingCustomer.email,
          loginCode: newCompanyCode,
          role: 'customer_admin',
          companyId: customerId,
          isActive: true,
        }).returning({ id: users.id, loginCode: users.loginCode });

        console.log('New user result:', newUserResult);
      }

      console.log('Sending email notification...');
      try {
        await emailService.sendCompanyCodeReset(existingCustomer.email, {
          companyName: existingCustomer.companyName,
          primaryContact: existingCustomer.primaryContact,
          oldCompanyCode: oldCompanyCode,
          newCompanyCode: newCompanyCode,
        });
        console.log('Email sent successfully');
      } catch (emailError) {
        console.error('Failed to send company code reset email:', emailError);
      }

      console.log('Reset code operation completed successfully');

      return NextResponse.json({ 
        success: true, 
        newCompanyCode: newCompanyCode,
        oldCompanyCode: oldCompanyCode,
        message: `Company code for "${existingCustomer.companyName}" has been reset successfully! New code ${newCompanyCode} has been sent to ${existingCustomer.email}.`
      });

    } catch (error) {
      console.error('Error in reset code API:', error);
      
      if (error instanceof z.ZodError) {
        console.log('Validation error:', error.issues);
        return NextResponse.json(
          { error: 'Invalid request data', details: error.issues },
          { status: 400 }
        );
      }

      if (error instanceof Error) {
        console.error('Full error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      } else {
        console.error('Unknown error:', error);
      }

      return NextResponse.json(
        { 
          error: 'Internal server error',
          details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
        }, 
        { status: 500 }
      );
    }
  }
);