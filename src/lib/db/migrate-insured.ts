import 'dotenv/config';
import { db } from './index';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    console.log('Creating insured_accounts table...');

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "insured_accounts" (
        "id" text PRIMARY KEY NOT NULL,
        "insured_name" text NOT NULL,
        "primary_contact_name" text NOT NULL,
        "contact_email" text NOT NULL,
        "phone" text NOT NULL,
        "street" text NOT NULL,
        "city" text NOT NULL,
        "state" text NOT NULL,
        "zipcode" text NOT NULL,
        "company_id" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `);

    console.log('Adding foreign key constraint...');

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "insured_accounts" ADD CONSTRAINT "insured_accounts_company_id_companies_id_fk"
        FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
