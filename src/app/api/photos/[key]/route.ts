export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getBindings } from '@/lib/auth';

/**
 * GET /api/photos/:key — Serve a photo from R2
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { r2 } = getBindings();
    const key = decodeURIComponent(params.key);
    const object = await r2.get(key);

    if (!object) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new NextResponse(object.body, { headers });
  } catch (error) {
    console.error('Photo serve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
