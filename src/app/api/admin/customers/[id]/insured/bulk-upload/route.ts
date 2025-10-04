import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { insuredAccounts } from '@/lib/db/schema';
import * as XLSX from 'xlsx';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ error: 'Invalid file type. Only .csv, .xlsx, and .xls files are allowed' }, { status: 400 });
    }

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 });
    }

    const accountsToInsert: Array<{
      insuredName: string;
      primaryContactName: string;
      contactEmail: string;
      phone: string;
      street: string;
      city: string;
      state: string;
      zipcode: string;
      companyId: string;
    }> = [];

    // Parse file based on type
    if (file.name.endsWith('.csv')) {
      // Handle CSV files
      const fileContent = await file.text();
      const lines = fileContent.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        return NextResponse.json({ error: 'File must contain at least a header row and one data row' }, { status: 400 });
      }

      // Skip header row
      const dataLines = lines.slice(1);

      for (const line of dataLines) {
        const fields = line.split(',').map(field => field.trim().replace(/^"|"$/g, ''));

        if (fields.length < 8) {
          continue; // Skip invalid rows
        }

        const [insuredName, primaryContactName, contactEmail, phone, street, city, state, zipcode] = fields;

        if (insuredName && primaryContactName && contactEmail && phone && street && city && state && zipcode) {
          accountsToInsert.push({
            insuredName,
            primaryContactName,
            contactEmail,
            phone,
            street,
            city,
            state,
            zipcode,
            companyId,
          });
        }
      }
    } else {
      // Handle Excel files (.xlsx, .xls)
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

      if (data.length < 2) {
        return NextResponse.json({ error: 'File must contain at least a header row and one data row' }, { status: 400 });
      }

      // Skip header row
      const dataRows = data.slice(1);

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];

        // Skip completely empty rows
        if (!row || row.length === 0 || row.every(cell => !cell)) {
          continue;
        }

        // Ensure we have at least 8 columns by padding with empty strings
        const paddedRow = [...row];
        while (paddedRow.length < 8) {
          paddedRow.push('');
        }

        const [insuredName, primaryContactName, contactEmail, phone, street, city, state, zipcode] = paddedRow.map(cell =>
          String(cell || '').trim()
        );

        // Only add if all required fields have values
        if (insuredName && primaryContactName && contactEmail && phone && street && city && state && zipcode) {
          accountsToInsert.push({
            insuredName,
            primaryContactName,
            contactEmail,
            phone,
            street,
            city,
            state,
            zipcode,
            companyId,
          });
        }
      }
    }

    if (accountsToInsert.length === 0) {
      return NextResponse.json({
        error: 'No valid records found in file. Please ensure your file has the following columns: Insured Name, Primary Contact Name, Contact Email, Phone, Street, City, State, Zipcode'
      }, { status: 400 });
    }

    // Insert all accounts in batch
    await db.insert(insuredAccounts).values(accountsToInsert);

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${accountsToInsert.length} insured accounts`
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json({ error: 'Failed to upload insured accounts' }, { status: 500 });
  }
}
