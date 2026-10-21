export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getBindings } from '@/lib/auth';
import { getProperty, updateProperty } from '@/lib/db';

/**
 * GET /api/properties/:id — Get single property with activity log
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

    // Parse photo JSON arrays and generate signed R2 URLs
    const { r2 } = getBindings();
    const interiorKeys: string[] = JSON.parse(property.interior_photos || '[]');
    const exteriorKeys: string[] = JSON.parse(property.exterior_photos || '[]');

    const interiorUrls = await Promise.all(
      interiorKeys.map(async (key) => {
        const obj = await r2.head(key);
        if (!obj) return null;
        // For now, return the key — in production, use presigned URLs or a Worker endpoint
        return `/api/photos/${encodeURIComponent(key)}`;
      })
    );

    const exteriorUrls = await Promise.all(
      exteriorKeys.map(async (key) => {
        const obj = await r2.head(key);
        if (!obj) return null;
        return `/api/photos/${encodeURIComponent(key)}`;
      })
    );

    return NextResponse.json({
      ...property,
      interior_photo_urls: interiorUrls.filter(Boolean),
      exterior_photo_urls: exteriorUrls.filter(Boolean),
    });
  } catch (error) {
    console.error('Get property error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/properties/:id — Update a property
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updated = await updateProperty(params.id, body, user.id);

    if (!updated) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update property error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
