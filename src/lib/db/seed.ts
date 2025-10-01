/* MRPA */

import "dotenv/config";
import { db } from './index';
import { users, companies } from './schema';
import { hashPassword } from '../auth/utils-node';
import { emailService } from '../email/sendgrid';

async function seed() {
  try {
    const [axsCompany] = await db.insert(companies).values({
      companyName: 'Community Insurance Center',
      companyCode: 'CIC001',
      primaryContact: 'AXS Modern',
      email: 'axsmodern@gmail.com',
      phone: '09262214228',
    }).returning();

    const adminPassword = 'Axs080125!';
    const hashedAdminPassword = await hashPassword(adminPassword);

    const [superAdmin] = await db.insert(users).values({
      firstName: 'AXS',
      lastName: 'Modern',
      email: 'axsmodern@gmail.com',
      passwordHash: hashedAdminPassword,
      role: 'super_admin',
      companyId: axsCompany.id,
      isActive: true,
    }).returning();

    console.log('Super Admin created:');
    console.log('Email: axsmodern@gmail.com');
    console.log('Password: Axs080125!');
    console.log('Role: super_admin');

    // try {
    //   await emailService.sendAdminCredentials(superAdmin.email, {
    //     firstName: superAdmin.firstName,
    //     lastName: superAdmin.lastName,
    //     email: superAdmin.email,
    //     password: adminPassword,
    //     companyName: axsCompany.companyName,
    //   });
    // } catch (emailError) {}
  } catch (error) {
    console.error('Error seeding database:', error);
    if (error instanceof Error) {
      throw new Error(`Seeding failed: ${error.message}`);
    }
    throw new Error('Seeding failed: Unknown error');
  }
}

if (require.main === module) {
  seed()
    .then(() => {
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

export default seed;