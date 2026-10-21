import type { Property, SanitizedProperty } from './types';
import { DESCRIPTION_LEAK_PATTERNS } from './constants';

/**
 * Generate a title for the sanitized property.
 * Pattern: "{Configuration} in {Area}" or "{Property Type} in {Area}"
 */
function generateTitle(property: Property): string {
  const what = property.configuration || property.property_type;
  return `${what} in ${property.location_area}`;
}

/**
 * Scan description for potential information leaks.
 * Returns array of warning strings.
 */
function scanDescription(description: string | null): string[] {
  if (!description) return [];

  const warnings: string[] = [];
  for (const { pattern, label } of DESCRIPTION_LEAK_PATTERNS) {
    // Reset regex state (global flag)
    pattern.lastIndex = 0;
    const match = pattern.exec(description);
    if (match) {
      warnings.push(`${label} detected: "${match[0]}"`);
    }
  }
  return warnings;
}

/**
 * Strip identifiable fields from a property record.
 * Returns a sanitized version safe for PDF export.
 */
export function sanitizeProperty(
  property: Property,
  interiorPhotoUrls: string[]
): SanitizedProperty {
  const warnings = scanDescription(property.description);

  return {
    id: property.id,
    title: generateTitle(property),
    location_area: property.location_area,
    city: property.city,
    property_type: property.property_type,
    configuration: property.configuration,
    land_type: property.land_type,
    carpet_area_sqft: property.carpet_area_sqft,
    builtup_area_sqft: property.builtup_area_sqft,
    plot_area_sqft: property.plot_area_sqft,
    asking_price: property.asking_price,
    price_per_sqft: property.price_per_sqft,
    furnishing: property.furnishing,
    facing: property.facing,
    age_of_property: property.age_of_property,
    amenities: property.amenities,
    description: property.description,
    status: property.status,
    interior_photo_urls: interiorPhotoUrls,
    warnings,
  };
}
