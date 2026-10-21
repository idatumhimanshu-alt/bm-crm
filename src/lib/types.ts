// ============================================================
// Domain types
// ============================================================

export type Role = 'super_admin' | 'sales' | 'executive';
export type PropertyType = 'residential' | 'commercial' | 'land';
export type Status = 'available' | 'under_negotiation' | 'sold' | 'withdrawn';
export type Furnishing = 'furnished' | 'semi-furnished' | 'unfurnished';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;

  // Location
  location_area: string;
  city: string;
  exact_address: string | null;
  building_name: string | null;
  floor: string | null;
  unit_number: string | null;

  // Configuration
  property_type: PropertyType;
  configuration: string | null;
  land_type: string | null;
  carpet_area_sqft: number | null;
  builtup_area_sqft: number | null;
  plot_area_sqft: number | null;

  // Pricing
  asking_price: number | null;
  price_per_sqft: number | null;

  // Details
  furnishing: Furnishing | null;
  facing: string | null;
  age_of_property: string | null;
  amenities: string | null;
  description: string | null;

  // Owner (IDENTIFIABLE)
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;

  // Source (IDENTIFIABLE)
  source: string | null;
  source_details: string | null;

  // Internal (IDENTIFIABLE)
  internal_notes: string | null;

  // Photos
  interior_photos: string; // JSON array
  exterior_photos: string; // JSON array (IDENTIFIABLE)

  // Status
  status: Status;

  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  property_id: string;
  user_id: string;
  action: string;
  details: string | null;
  created_at: string;
}

// ============================================================
// API types
// ============================================================

export interface PropertyListParams {
  search?: string;
  location_area?: string;
  configuration?: string;    // comma-separated for multi-select
  budget_min?: number;
  budget_max?: number;
  status?: string;           // comma-separated for multi-select
  page?: number;
  limit?: number;
}

export interface PropertyCreateInput {
  location_area: string;
  city?: string;
  exact_address?: string;
  building_name?: string;
  floor?: string;
  unit_number?: string;
  property_type: PropertyType;
  configuration?: string;
  land_type?: string;
  carpet_area_sqft?: number;
  builtup_area_sqft?: number;
  plot_area_sqft?: number;
  asking_price?: number;
  price_per_sqft?: number;
  furnishing?: Furnishing;
  facing?: string;
  age_of_property?: string;
  amenities?: string;
  description?: string;
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
  source?: string;
  source_details?: string;
  internal_notes?: string;
  status?: Status;
}

export interface SanitizedProperty {
  id: string;
  title: string; // Generated: "{config} in {area}" or "{type} in {area}"
  location_area: string;
  city: string;
  property_type: PropertyType;
  configuration: string | null;
  land_type: string | null;
  carpet_area_sqft: number | null;
  builtup_area_sqft: number | null;
  plot_area_sqft: number | null;
  asking_price: number | null;
  price_per_sqft: number | null;
  furnishing: Furnishing | null;
  facing: string | null;
  age_of_property: string | null;
  amenities: string | null;
  description: string | null; // Scanned for leaks
  status: Status;
  interior_photo_urls: string[]; // Signed R2 URLs
  warnings: string[]; // Description scan warnings
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
