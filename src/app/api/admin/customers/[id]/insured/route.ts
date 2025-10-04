import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { insuredAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const accounts = await db
      .select()
      .from(insuredAccounts)
      .where(eq(insuredAccounts.companyId, id));

    return NextResponse.json({ insuredAccounts: accounts });
  } catch (error) {
    console.error('Failed to fetch insured accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch insured accounts' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const body = await request.json();
    const { insuredName, primaryContactName, contactEmail, phone, street, city, state, zipcode } = body;

    if (!insuredName || !primaryContactName || !contactEmail || !phone || !street || !city || !state || !zipcode) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const [newAccount] = await db.insert(insuredAccounts).values({
      insuredName,
      primaryContactName,
      contactEmail,
      phone,
      street,
      city,
      state,
      zipcode,
      companyId,
    }).returning();

    return NextResponse.json({ insuredAccount: newAccount }, { status: 201 });
  } catch (error) {
    console.error('Failed to create insured account:', error);
    return NextResponse.json({ error: 'Failed to create insured account' }, { status: 500 });
  }
}
