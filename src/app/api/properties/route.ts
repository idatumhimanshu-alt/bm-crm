export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { listProperties, createProperty } from '@/lib/db';
import type { PropertyListParams, PropertyCreateInput } from '@/lib/types';

/**
 * GET /api/properties — List/search/filter properties
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const params: PropertyListParams = {
    search: url.searchParams.get('search') ?? undefined,
    location_area: url.searchParams.get('location_area') ?? undefined,
    configuration: url.searchParams.get('configuration') ?? undefined,
    budget_min: url.searchParams.get('budget_min') ? Number(url.searchParams.get('budget_min')) : undefined,
    budget_max: url.searchParams.get('budget_max') ? Number(url.searchParams.get('budget_max')) : undefined,
    status: url.searchParams.get('status') ?? undefined,
    page: url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1,
    limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
  };

  try {
    const result = await listProperties(params);
    return NextResponse.json(result);
  } catch (error) {
    console.error('List properties error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/properties — Create a new property
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: PropertyCreateInput = await request.json();

    // Validate required fields
    if (!body.location_area) {
      return NextResponse.json({ error: 'location_area is required' }, { status: 400 });
    }
    if (!body.property_type || !['residential', 'commercial', 'land'].includes(body.property_type)) {
      return NextResponse.json({ error: 'Valid property_type is required' }, { status: 400 });
    }

    const property = await createProperty(body, user.id);
    return NextResponse.json(property, { status: 201 });
  } catch (error) {
    console.error('Create property error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
