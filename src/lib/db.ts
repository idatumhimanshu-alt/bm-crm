import { getBindings } from './auth';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './constants';
import type { Property, PropertyListParams, PropertyCreateInput, PaginatedResponse, ActivityLog } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enable foreign keys for a D1 connection.
 */
async function enableForeignKeys(db: D1Database) {
  await db.prepare('PRAGMA foreign_keys = ON').run();
}

/**
 * List properties with search, filters, and pagination.
 */
export async function listProperties(
  params: PropertyListParams
): Promise<PaginatedResponse<Property>> {
  const { db } = getBindings();
  await enableForeignKeys(db);

  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, params.limit ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * limit;

  let query = '';
  let countQuery = '';
  const bindings: any[] = [];
  const countBindings: any[] = [];

  if (params.search && params.search.trim()) {
    // FTS5 search — join property_fts with property
    const searchTerm = params.search.trim().replace(/"/g, '') + '*'; // prefix matching
    const baseJoin = `
      FROM property p
      INNER JOIN property_fts fts ON p.rowid = fts.rowid
      WHERE property_fts MATCH ?
    `;
    query = `SELECT p.* ${baseJoin}`;
    countQuery = `SELECT COUNT(*) as total ${baseJoin}`;
    bindings.push(searchTerm);
    countBindings.push(searchTerm);
  } else {
    query = 'SELECT * FROM property p WHERE 1=1';
    countQuery = 'SELECT COUNT(*) as total FROM property p WHERE 1=1';
  }

  // Apply filters
  if (params.location_area) {
    query += ' AND p.location_area = ?';
    countQuery += ' AND p.location_area = ?';
    bindings.push(params.location_area);
    countBindings.push(params.location_area);
  }

  if (params.configuration) {
    const configs = params.configuration.split(',').map(c => c.trim()).filter(Boolean);
    if (configs.length > 0) {
      const placeholders = configs.map(() => '?').join(',');
      query += ` AND p.configuration IN (${placeholders})`;
      countQuery += ` AND p.configuration IN (${placeholders})`;
      bindings.push(...configs);
      countBindings.push(...configs);
    }
  }

  if (params.budget_min != null) {
    query += ' AND p.asking_price >= ?';
    countQuery += ' AND p.asking_price >= ?';
    bindings.push(params.budget_min);
    countBindings.push(params.budget_min);
  }

  if (params.budget_max != null) {
    query += ' AND p.asking_price <= ?';
    countQuery += ' AND p.asking_price <= ?';
    bindings.push(params.budget_max);
    countBindings.push(params.budget_max);
  }

  if (params.status) {
    const statuses = params.status.split(',').map(s => s.trim()).filter(Boolean);
    if (statuses.length > 0) {
      const placeholders = statuses.map(() => '?').join(',');
      query += ` AND p.status IN (${placeholders})`;
      countQuery += ` AND p.status IN (${placeholders})`;
      bindings.push(...statuses);
      countBindings.push(...statuses);
    }
  }

  // Sort: newest first (search results already ranked by BM25)
  if (!params.search) {
    query += ' ORDER BY p.created_at DESC';
  }

  // Pagination
  query += ' LIMIT ? OFFSET ?';
  bindings.push(limit, offset);

  // Execute both queries
  const [dataResult, countResult] = await Promise.all([
    db.prepare(query).bind(...bindings).all<Property>(),
    db.prepare(countQuery).bind(...countBindings).first<{ total: number }>(),
  ]);

  const total = countResult?.total ?? 0;

  return {
    data: dataResult.results ?? [],
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  };
}

/**
 * Get a single property by ID.
 */
export async function getProperty(id: string): Promise<Property | null> {
  const { db } = getBindings();
  const result = await db.prepare('SELECT * FROM property WHERE id = ?').bind(id).first<Property>();
  return result ?? null;
}

/**
 * Create a new property.
 */
export async function createProperty(
  input: PropertyCreateInput,
  userId: string
): Promise<Property> {
  const { db } = getBindings();
  await enableForeignKeys(db);

  const id = uuidv4();
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  const result = await db.prepare(`
    INSERT INTO property (
      id, location_area, city, exact_address, building_name, floor, unit_number,
      property_type, configuration, land_type, carpet_area_sqft, builtup_area_sqft, plot_area_sqft,
      asking_price, price_per_sqft, furnishing, facing, age_of_property, amenities, description,
      owner_name, owner_phone, owner_email, source, source_details, internal_notes,
      interior_photos, exterior_photos, status, created_by, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      '[]', '[]', ?, ?, ?, ?
    )
  `).bind(
    id,
    input.location_area,
    input.city ?? 'Pune',
    input.exact_address ?? null,
    input.building_name ?? null,
    input.floor ?? null,
    input.unit_number ?? null,
    input.property_type,
    input.configuration ?? null,
    input.land_type ?? null,
    input.carpet_area_sqft ?? null,
    input.builtup_area_sqft ?? null,
    input.plot_area_sqft ?? null,
    input.asking_price ?? null,
    input.price_per_sqft ?? null,
    input.furnishing ?? null,
    input.facing ?? null,
    input.age_of_property ?? null,
    input.amenities ?? null,
    input.description ?? null,
    input.owner_name ?? null,
    input.owner_phone ?? null,
    input.owner_email ?? null,
    input.source ?? null,
    input.source_details ?? null,
    input.internal_notes ?? null,
    input.status ?? 'available',
    userId,
    now,
    now
  ).run();

  // Log activity
  await logActivity(db, id, userId, 'created', null);

  return (await getProperty(id))!;
}

/**
 * Update an existing property.
 */
export async function updateProperty(
  id: string,
  input: Partial<PropertyCreateInput>,
  userId: string
): Promise<Property | null> {
  const { db } = getBindings();
  await enableForeignKeys(db);

  const existing = await getProperty(id);
  if (!existing) return null;

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  // Build SET clause dynamically
  const fields: string[] = [];
  const values: any[] = [];

  const updatableFields = [
    'location_area', 'city', 'exact_address', 'building_name', 'floor', 'unit_number',
    'property_type', 'configuration', 'land_type', 'carpet_area_sqft', 'builtup_area_sqft', 'plot_area_sqft',
    'asking_price', 'price_per_sqft', 'furnishing', 'facing', 'age_of_property', 'amenities', 'description',
    'owner_name', 'owner_phone', 'owner_email', 'source', 'source_details', 'internal_notes', 'status',
  ] as const;

  for (const field of updatableFields) {
    if (field in input) {
      fields.push(`${field} = ?`);
      values.push((input as any)[field] ?? null);
    }
  }

  if (fields.length === 0) return existing;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  await db.prepare(
    `UPDATE property SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  // Log activity
  const changes = Object.fromEntries(
    updatableFields
      .filter(f => f in input)
      .map(f => [f, { from: (existing as any)[f], to: (input as any)[f] }])
  );
  await logActivity(db, id, userId, 'updated', JSON.stringify(changes));

  return await getProperty(id);
}

/**
 * Log an activity.
 */
export async function logActivity(
  db: D1Database,
  propertyId: string,
  userId: string,
  action: string,
  details: string | null
) {
  const id = uuidv4();
  await db.prepare(
    `INSERT INTO activity_log (id, property_id, user_id, action, details)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(id, propertyId, userId, action, details).run();
}

/**
 * Get activity log for a property.
 */
export async function getActivityLog(
  propertyId: string,
  limit = 20
): Promise<(ActivityLog & { user_name: string })[]> {
  const { db } = getBindings();
  const result = await db.prepare(`
    SELECT al.*, u.name as user_name
    FROM activity_log al
    JOIN user u ON al.user_id = u.id
    WHERE al.property_id = ?
    ORDER BY al.created_at DESC
    LIMIT ?
  `).bind(propertyId, limit).all<ActivityLog & { user_name: string }>();
  return result.results ?? [];
}
