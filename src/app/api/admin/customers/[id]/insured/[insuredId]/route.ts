import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { insuredAccounts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; insuredId: string }> }
) {
  try {
    const { id, insuredId } = await params;

    const [account] = await db
      .select()
      .from(insuredAccounts)
      .where(
        and(
          eq(insuredAccounts.id, insuredId),
          eq(insuredAccounts.companyId, id)
        )
      );

    if (!account) {
      return NextResponse.json({ error: 'Insured account not found' }, { status: 404 });
    }

    return NextResponse.json({ insuredAccount: account });
  } catch (error) {
    console.error('Failed to fetch insured account:', error);
    return NextResponse.json({ error: 'Failed to fetch insured account' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; insuredId: string }> }
) {
  try {
    const { id, insuredId } = await params;
    const body = await request.json();
    const { insuredName, primaryContactName, contactEmail, phone, street, city, state, zipcode } = body;

    if (!insuredName || !primaryContactName || !contactEmail || !phone || !street || !city || !state || !zipcode) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const [updatedAccount] = await db
      .update(insuredAccounts)
      .set({
        insuredName,
        primaryContactName,
        contactEmail,
        phone,
        street,
        city,
        state,
        zipcode,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(insuredAccounts.id, insuredId),
          eq(insuredAccounts.companyId, id)
        )
      )
      .returning();

    if (!updatedAccount) {
      return NextResponse.json({ error: 'Insured account not found' }, { status: 404 });
    }

    return NextResponse.json({ insuredAccount: updatedAccount });
  } catch (error) {
    console.error('Failed to update insured account:', error);
    return NextResponse.json({ error: 'Failed to update insured account' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; insuredId: string }> }
) {
  try {
    const { id, insuredId } = await params;

    await db
      .delete(insuredAccounts)
      .where(
        and(
          eq(insuredAccounts.id, insuredId),
          eq(insuredAccounts.companyId, id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete insured account:', error);
    return NextResponse.json({ error: 'Failed to delete insured account' }, { status: 500 });
  }
}
