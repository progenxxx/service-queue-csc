import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { companies, users, serviceRequests, activityLogs, notifications } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { generateCompanyCode } from '@/lib/auth/utils-node';
import { emailService } from '@/lib/email/sendgrid';

const createCustomerSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  primaryContact: z.string().min(1, 'Primary contact is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address'),
});

const deleteCustomerSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
});

const resetCodeSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
});

export const GET = requireRole(['super_admin'])(
  async () => {
    try {
      const customersWithUsers = await db.query.companies.findMany({
        with: {
          users: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              isActive: true,
              loginCode: true, 
            },
          },
        },
        orderBy: (companies, { asc }) => [asc(companies.companyName)],
      });

      return NextResponse.json({ customers: customersWithUsers });
    } catch (error) {
      console.error('Failed to fetch customers for management:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

export const POST = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      
      if (body.action === 'resetCode') {
        const validatedData = resetCodeSchema.parse(body);
        
        const existingCustomer = await db.query.companies.findFirst({
          where: eq(companies.id, validatedData.customerId),
          with: {
            users: {
              where: eq(users.role, 'customer_admin'),
              limit: 1,
            },
          },
        });

        if (!existingCustomer) {
          return NextResponse.json(
            { error: 'Customer not found' },
            { status: 404 }
          );
        }

        let newCompanyCode = generateCompanyCode();
        let codeExists = true;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (codeExists && attempts < maxAttempts) {
          const existingCode = await db.query.companies.findFirst({
            where: eq(companies.companyCode, newCompanyCode),
          });
          
          if (!existingCode) {
            codeExists = false;
          } else {
            newCompanyCode = generateCompanyCode();
            attempts++;
          }
        }

        if (attempts >= maxAttempts) {
          return NextResponse.json(
            { error: 'Unable to generate unique company code. Please try again.' },
            { status: 500 }
          );
        }

        await db.update(companies)
          .set({ 
            companyCode: newCompanyCode,
            updatedAt: new Date()
          })
          .where(eq(companies.id, validatedData.customerId));

        await db.update(users)
          .set({ 
            loginCode: newCompanyCode, 
            updatedAt: new Date()
          })
          .where(eq(users.companyId, validatedData.customerId));

        if (existingCustomer.users.length > 0) {
          const customerAdmin = existingCustomer.users[0];
          try {
            await emailService.sendCustomerAdminWelcome(customerAdmin.email, {
              firstName: customerAdmin.firstName,
              lastName: customerAdmin.lastName,
              email: customerAdmin.email,
              loginCode: newCompanyCode, 
              companyName: existingCustomer.companyName,
            });
            console.log(`Reset code email sent successfully to ${customerAdmin.email}`);
          } catch (emailError) {
            console.error('Failed to send reset code email:', emailError);
          }
        }

        return NextResponse.json({
          success: true,
          companyCode: newCompanyCode,
          message: `Login code reset successfully for "${existingCustomer.companyName}". New code: ${newCompanyCode}`
        });
      }

      const validatedData = createCustomerSchema.parse(body);

      const existingCompany = await db.query.companies.findFirst({
        where: eq(companies.email, validatedData.email),
      });

      if (existingCompany) {
        return NextResponse.json(
          { error: 'A company with this email already exists' },
          { status: 400 }
        );
      }

      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, validatedData.email),
      });

      if (existingUser) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 400 }
        );
      }

      let companyCode = generateCompanyCode();
      let codeExists = true;
      let attempts = 0;
      const maxAttempts = 10;
      
      while (codeExists && attempts < maxAttempts) {
        const existingCode = await db.query.companies.findFirst({
          where: eq(companies.companyCode, companyCode),
        });
        
        if (!existingCode) {
          codeExists = false;
        } else {
          companyCode = generateCompanyCode();
          attempts++;
        }
      }

      if (attempts >= maxAttempts) {
        return NextResponse.json(
          { error: 'Unable to generate unique company code. Please try again.' },
          { status: 500 }
        );
      }

      console.log('Generated company code:', companyCode);

      const [newCompany] = await db.insert(companies).values({
        companyName: validatedData.companyName,
        companyCode: companyCode, 
        primaryContact: validatedData.primaryContact,
        phone: validatedData.phone || '',
        email: validatedData.email,
      }).returning();

      console.log('Created company:', newCompany);

      const nameParts = validatedData.primaryContact.trim().split(/\s+/);
      const firstName = nameParts[0] || validatedData.primaryContact;
      const lastName = nameParts.slice(1).join(' ') || '';

      const [newUser] = await db.insert(users).values({
        firstName: firstName,
        lastName: lastName,
        email: validatedData.email,
        loginCode: companyCode, 
        role: 'customer_admin',
        companyId: newCompany.id,
        isActive: true,
      }).returning();

      console.log('Created user with loginCode:', newUser.loginCode);
      console.log('Company code matches user loginCode:', newCompany.companyCode === newUser.loginCode);

      emailService.sendCustomerAdminWelcome(validatedData.email, {
        firstName: firstName,
        lastName: lastName,
        email: validatedData.email,
        loginCode: companyCode, 
        companyName: validatedData.companyName,
      }).then(() => {
        console.log(`Customer admin welcome email sent successfully to ${validatedData.email}`);
      }).catch(emailError => {
        console.error('Failed to send customer admin welcome email:', emailError);
      });

      const customerWithUsers = await db.query.companies.findFirst({
        where: eq(companies.id, newCompany.id),
        with: {
          users: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              isActive: true,
              loginCode: true,
            },
          },
        },
      });

      return NextResponse.json({ 
        success: true, 
        customer: customerWithUsers,
        companyCode: companyCode,
        message: `Company "${validatedData.companyName}" created successfully! Customer admin user created with login code ${companyCode} sent to ${validatedData.email}.`,
        debug: {
          companyCode: newCompany.companyCode,
          userLoginCode: newUser.loginCode,
          codesMatch: newCompany.companyCode === newUser.loginCode
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.issues },
          { status: 400 }
        );
      }

      console.error('Failed to create customer or reset code:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

export const DELETE = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const validatedData = deleteCustomerSchema.parse(body);
      const customerId = validatedData.customerId;

      const existingCustomer = await db.query.companies.findFirst({
        where: eq(companies.id, customerId),
      });

      if (!existingCustomer) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }

      const hasActiveRequests = await db.query.serviceRequests.findFirst({
        where: eq(serviceRequests.companyId, customerId),
      });

      if (hasActiveRequests) {
        return NextResponse.json(
          { error: 'Cannot delete customer with active service requests. Please close or transfer all service requests first.' },
          { status: 400 }
        );
      }

      // Delete in the correct order to handle foreign key constraints within a transaction
      await db.transaction(async (tx) => {
        // First, get all users for this company
        const companyUsers = await tx.query.users.findMany({
          where: eq(users.companyId, customerId),
          columns: { id: true }
        });

        const userIds = companyUsers.map(user => user.id);

        // 1. Delete notifications for users in this company
        if (userIds.length > 0) {
          for (const userId of userIds) {
            await tx.delete(notifications).where(eq(notifications.userId, userId));
          }
        }

        // 2. Delete activity logs related to this company
        await tx.delete(activityLogs).where(eq(activityLogs.companyId, customerId));

        // 3. Delete activity logs related to users in this company  
        if (userIds.length > 0) {
          for (const userId of userIds) {
            await tx.delete(activityLogs).where(eq(activityLogs.userId, userId));
          }
        }

        // 4. Delete users
        await tx.delete(users).where(eq(users.companyId, customerId));
        
        // 5. Finally delete the company
        await tx.delete(companies).where(eq(companies.id, customerId));
      });

      console.log(`Customer ${existingCustomer.companyName} (${existingCustomer.companyCode}) and all associated users deleted successfully`);

      return NextResponse.json({ 
        success: true, 
        message: `Customer "${existingCustomer.companyName}" and all associated users have been deleted successfully.` 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.issues },
          { status: 400 }
        );
      }

      console.error('Failed to delete customer:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);

export const PUT = requireRole(['super_admin'])(
  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const updateCustomerSchema = z.object({
        customerId: z.string().min(1, 'Customer ID is required'),
        companyName: z.string().min(1, 'Company name is required').optional(),
        primaryContact: z.string().min(1, 'Primary contact is required').optional(),
        phone: z.string().optional(),
        email: z.string().email('Invalid email address').optional(),
      });

      const validatedData = updateCustomerSchema.parse(body);
      const { customerId, ...updateData } = validatedData;

      const existingCustomer = await db.query.companies.findFirst({
        where: eq(companies.id, customerId),
        with: {
          users: {
            where: eq(users.role, 'customer_admin'),
            limit: 1,
          },
        },
      });

      if (!existingCustomer) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        );
      }

      if (updateData.email && updateData.email !== existingCustomer.email) {
        const emailExists = await db.query.companies.findFirst({
          where: eq(companies.email, updateData.email),
        });

        if (emailExists) {
          return NextResponse.json(
            { error: 'A company with this email already exists' },
            { status: 400 }
          );
        }

        const userEmailExists = await db.query.users.findFirst({
          where: eq(users.email, updateData.email),
        });

        if (userEmailExists && userEmailExists.companyId !== customerId) {
          return NextResponse.json(
            { error: 'A user with this email already exists' },
            { status: 400 }
          );
        }
      }

      const [updatedCompany] = await db.update(companies)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, customerId))
        .returning();

      if ((updateData.email || updateData.primaryContact) && existingCustomer.users.length > 0) {
        const updateUserData: Record<string, string | Date> = {};
        
        if (updateData.email) {
          updateUserData.email = updateData.email;
        }
        
        if (updateData.primaryContact) {
          const nameParts = updateData.primaryContact.trim().split(/\s+/);
          updateUserData.firstName = nameParts[0] || updateData.primaryContact;
          updateUserData.lastName = nameParts.slice(1).join(' ') || '';
        }

        if (Object.keys(updateUserData).length > 0) {
          updateUserData.updatedAt = new Date();
          
          await db.update(users)
            .set(updateUserData)
            .where(eq(users.companyId, customerId));
        }
      }

      const customerWithUsers = await db.query.companies.findFirst({
        where: eq(companies.id, customerId),
        with: {
          users: {
            columns: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              isActive: true,
              loginCode: true, 
            },
          },
        },
      });

      console.log(`Customer ${updatedCompany.companyName} (${updatedCompany.companyCode}) updated successfully`);

      return NextResponse.json({ 
        success: true, 
        customer: customerWithUsers,
        message: `Customer "${updatedCompany.companyName}" updated successfully.`
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.issues },
          { status: 400 }
        );
      }

      console.error('Failed to update customer:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
);