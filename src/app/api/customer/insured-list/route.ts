import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { insuredAccounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const companyId = request.headers.get('x-company-id');

    if (!companyId) {
      return NextResponse.json({ error: 'Company not found' }, { status: 400 });
    }

    const accounts = await db
      .select({
        insuredName: insuredAccounts.insuredName,
      })
      .from(insuredAccounts)
      .where(eq(insuredAccounts.companyId, companyId));

    // Return array of insured names
    const insuredList = accounts.map(account => account.insuredName);

    return NextResponse.json({ insuredList });
  } catch (error) {
    console.error('Failed to fetch insured list:', error);
    return NextResponse.json({ error: 'Failed to fetch insured list' }, { status: 500 });
  }
}
