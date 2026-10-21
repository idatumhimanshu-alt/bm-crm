// ============================================================
// Location Areas — hardcoded for MVP (DB table post-MVP)
// ============================================================
export const PUNE_AREAS = [
  'Baner',
  'Balewadi',
  'Hinjewadi',
  'Wakad',
  'Kothrud',
  'Karve Nagar',
  'Warje',
  'Bavdhan',
  'Pashan',
  'Aundh',
  'Shivajinagar',
  'Deccan',
  'Kharadi',
  'Viman Nagar',
  'Hadapsar',
  'Magarpatta',
  'Kondhwa',
  'NIBM',
  'Undri',
  'Pimpri-Chinchwad',
] as const;

// ============================================================
// Configuration options
// ============================================================
export const CONFIGURATIONS = [
  '1RK',
  '1BHK',
  '1.5BHK',
  '2BHK',
  '2.5BHK',
  '3BHK',
  '3.5BHK',
  '4BHK',
  '4+BHK',
  'Shop',
  'Office',
  'Showroom',
  'Warehouse',
  'Plot',
] as const;

// ============================================================
// Status values
// ============================================================
export const STATUSES = [
  { value: 'available', label: 'Available' },
  { value: 'under_negotiation', label: 'Under Negotiation' },
  { value: 'sold', label: 'Sold' },
  { value: 'withdrawn', label: 'Withdrawn' },
] as const;

// ============================================================
// Property types
// ============================================================
export const PROPERTY_TYPES = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'land', label: 'Land' },
] as const;

// ============================================================
// Furnishing options
// ============================================================
export const FURNISHING_OPTIONS = [
  { value: 'furnished', label: 'Furnished' },
  { value: 'semi-furnished', label: 'Semi-Furnished' },
  { value: 'unfurnished', label: 'Unfurnished' },
] as const;

// ============================================================
// Fields stripped from sanitized PDF export
// ============================================================
export const IDENTIFIABLE_FIELDS = [
  'exact_address',
  'building_name',
  'floor',
  'unit_number',
  'owner_name',
  'owner_phone',
  'owner_email',
  'source',
  'source_details',
  'internal_notes',
  'exterior_photos',
] as const;

// ============================================================
// Description scan patterns (for pre-export warning)
// ============================================================
export const DESCRIPTION_LEAK_PATTERNS = [
  { pattern: /\b(?:floor|flr|fl)\s*(?:no\.?\s*)?\d+/gi, label: 'Floor reference' },
  { pattern: /\b(?:unit|flat|shop)\s*(?:no\.?\s*)?\w+/gi, label: 'Unit reference' },
  { pattern: /\b(?:tower|wing|building|bldg)\s+[a-zA-Z0-9]+/gi, label: 'Building reference' },
  { pattern: /\b(?:near|opposite|behind|next to|adjacent)\s+.{3,30}/gi, label: 'Landmark reference' },
  { pattern: /\b\d{10}\b/g, label: 'Phone number' },
] as const;

// ============================================================
// Pagination
// ============================================================
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;

// ============================================================
// Photo limits
// ============================================================
export const MAX_INTERIOR_PHOTOS = 3;
export const MAX_EXTERIOR_PHOTOS = 3;
export const MAX_PHOTO_WIDTH = 1200;
export const PHOTO_QUALITY = 0.8;
