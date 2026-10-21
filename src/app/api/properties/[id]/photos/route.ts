export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getBindings } from '@/lib/auth';
import { getProperty, logActivity } from '@/lib/db';

/**
 * POST /api/properties/:id/photos — Upload photos to R2
 *
 * Expects multipart form data with:
 * - type: "interior" | "exterior"
 * - index: 0-2 (photo slot)
 * - file: the image file (already compressed client-side)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { db, r2 } = getBindings();

    const property = await getProperty(params.id);
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const type = formData.get('type') as string;
    const index = formData.get('index') as string;
    const file = formData.get('file') as File;

    if (!type || !['interior', 'exterior'].includes(type)) {
      return NextResponse.json({ error: 'type must be "interior" or "exterior"' }, { status: 400 });
    }
    if (!index || !['0', '1', '2'].includes(index)) {
      return NextResponse.json({ error: 'index must be 0, 1, or 2' }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    // R2 key convention: properties/{uuid}/{type}/{index+1}.jpg
    const r2Key = `properties/${params.id}/${type}/${Number(index) + 1}.jpg`;

    // Upload to R2
    await r2.put(r2Key, await file.arrayBuffer(), {
      httpMetadata: { contentType: 'image/jpeg' },
    });

    // Update the property's photo array
    const photoField = type === 'interior' ? 'interior_photos' : 'exterior_photos';
    const currentPhotos: string[] = JSON.parse(
      (property as any)[photoField] || '[]'
    );

    // Replace or add the photo at the index
    const idx = Number(index);
    while (currentPhotos.length <= idx) {
      currentPhotos.push('');
    }
    currentPhotos[idx] = r2Key;

    // Remove empty slots from end
    while (currentPhotos.length > 0 && !currentPhotos[currentPhotos.length - 1]) {
      currentPhotos.pop();
    }

    await db.prepare(
      `UPDATE property SET ${photoField} = ?, updated_at = ? WHERE id = ?`
    ).bind(
      JSON.stringify(currentPhotos),
      new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      params.id
    ).run();

    await logActivity(db, params.id, user.id, 'photo_uploaded', JSON.stringify({ type, index: idx }));

    return NextResponse.json({ key: r2Key, photos: currentPhotos });
  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
