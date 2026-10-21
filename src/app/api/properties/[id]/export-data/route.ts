export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getBindings } from '@/lib/auth';
import { getProperty, logActivity } from '@/lib/db';
import { sanitizeProperty } from '@/lib/sanitize';

/**
 * GET /api/properties/:id/export-data — Sanitized JSON for PDF export
 *
 * This is the sanitization boundary. All identifiable fields are stripped here.
 * The frontend receives only safe-to-share data and renders the PDF client-side.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const property = await getProperty(params.id);
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Generate interior photo URLs (exterior photos are IDENTIFIABLE — stripped)
    const { r2 } = getBindings();
    const interiorKeys: string[] = JSON.parse(property.interior_photos || '[]');

    const interiorUrls = await Promise.all(
      interiorKeys.map(async (key) => {
        const obj = await r2.head(key);
        if (!obj) return null;
        return `/api/photos/${encodeURIComponent(key)}`;
      })
    );

    const sanitized = sanitizeProperty(
      property,
      interiorUrls.filter(Boolean) as string[]
    );

    // Log the export
    const { db } = getBindings();
    await logActivity(db, params.id, user.id, 'exported_pdf', null);

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error('Export data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
