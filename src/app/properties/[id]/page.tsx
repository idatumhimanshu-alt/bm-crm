'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { STATUSES } from '@/lib/constants';
import type { Property, SanitizedProperty } from '@/lib/types';

function formatPrice(price: number | null): string {
  if (!price) return '—';
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
  return `₹${price.toLocaleString('en-IN')}`;
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUSES.find(s => s.value === status)?.label ?? status;
  return <span className={`badge badge-${status}`}>{label}</span>;
}

interface Activity {
  id: string;
  action: string;
  user_name: string;
  created_at: string;
  details: string | null;
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [property, setProperty] = useState<(Property & { interior_photo_urls: string[]; exterior_photo_urls: string[] }) | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportWarnings, setExportWarnings] = useState<string[]>([]);
  const [showWarningModal, setShowWarningModal] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/properties/${id}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setProperty(data);
      } catch {
        setProperty(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleExport() {
    setExporting(true);
    try {
      // Fetch sanitized data
      const res = await fetch(`/api/properties/${id}/export-data`);
      if (!res.ok) throw new Error('Export failed');
      const sanitized: SanitizedProperty = await res.json();

      if (sanitized.warnings.length > 0) {
        setExportWarnings(sanitized.warnings);
        setShowWarningModal(true);
        setExporting(false);
        return;
      }

      await generatePdf(sanitized);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  }

  async function generatePdf(data: SanitizedProperty) {
    // Dynamic import jsPDF to keep bundle small
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    let y = margin;

    // Header
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('B&M — Soil to Structure Pvt Ltd', margin, y);
    doc.text('CONFIDENTIAL', pageWidth - margin, y, { align: 'right' });
    y += 10;

    // Title
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text(data.title, margin, y);
    y += 8;

    // Location
    doc.setFontSize(11);
    doc.setTextColor(80);
    doc.text(`${data.location_area}, ${data.city}`, margin, y);
    y += 10;

    // Separator
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Details table
    doc.setFontSize(10);
    doc.setTextColor(0);

    const fields: [string, string][] = [
      ['Property Type', data.property_type],
      ['Configuration', data.configuration ?? '—'],
      ['Land Type', data.land_type ?? '—'],
      ['Carpet Area', data.carpet_area_sqft ? `${data.carpet_area_sqft} sq.ft` : '—'],
      ['Builtup Area', data.builtup_area_sqft ? `${data.builtup_area_sqft} sq.ft` : '—'],
      ['Plot Area', data.plot_area_sqft ? `${data.plot_area_sqft} sq.ft` : '—'],
      ['Asking Price', formatPrice(data.asking_price)],
      ['Price/sq.ft', data.price_per_sqft ? `₹${data.price_per_sqft.toLocaleString('en-IN')}` : '—'],
      ['Furnishing', data.furnishing ?? '—'],
      ['Facing', data.facing ?? '—'],
      ['Age', data.age_of_property ?? '—'],
      ['Status', data.status],
    ];

    for (const [label, value] of fields) {
      doc.setTextColor(100);
      doc.text(label, margin, y);
      doc.setTextColor(0);
      doc.text(value, margin + 50, y);
      y += 6;

      if (y > 270) {
        doc.addPage();
        y = margin;
      }
    }

    y += 4;

    // Amenities
    if (data.amenities) {
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text('Amenities', margin, y);
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(60);
      const amenityLines = doc.splitTextToSize(data.amenities, contentWidth);
      doc.text(amenityLines, margin, y);
      y += amenityLines.length * 4 + 4;
    }

    // Description
    if (data.description) {
      if (y > 240) { doc.addPage(); y = margin; }
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text('Description', margin, y);
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(60);
      const descLines = doc.splitTextToSize(data.description, contentWidth);
      doc.text(descLines, margin, y);
      y += descLines.length * 4 + 8;
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-IN')} — For client use only`,
      margin,
      doc.internal.pageSize.getHeight() - 10
    );

    // Save
    doc.save(`${data.title.replace(/\s+/g, '_')}.pdf`);
  }

  if (loading) return <div className="loading">Loading property...</div>;
  if (!property) return <div className="empty-state"><div className="empty-state-title">Property not found</div></div>;

  return (
    <div>
      {/* Header */}
      <div className="detail-header">
        <div>
          <button className="btn btn-outline btn-sm" onClick={() => router.back()} style={{ marginBottom: 8 }}>
            ← Back
          </button>
          <div className="detail-title">
            {property.configuration ?? property.property_type} in {property.location_area}
          </div>
          <div style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
            {property.location_area}, {property.city} &nbsp; <StatusBadge status={property.status} />
          </div>
        </div>
        <div className="detail-actions">
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? 'Exporting...' : '📄 Export PDF'}
          </button>
          <button
            className="btn btn-outline"
            onClick={() => router.push(`/properties/${id}/edit`)}
          >
            ✏️ Edit
          </button>
        </div>
      </div>

      <div className="detail-grid">
        {/* Left column */}
        <div>
          {/* Photos */}
          <div className="detail-section">
            <div className="detail-section-title">Interior Photos</div>
            <div className="photo-gallery">
              {property.interior_photo_urls.length > 0 ? (
                property.interior_photo_urls.map((url, i) => (
                  <img key={i} src={url} alt={`Interior ${i + 1}`} />
                ))
              ) : (
                <div className="photo-placeholder">No interior photos</div>
              )}
            </div>

            <div className="detail-section-title" style={{ marginTop: 16 }}>Exterior Photos</div>
            <div className="photo-gallery">
              {property.exterior_photo_urls.length > 0 ? (
                property.exterior_photo_urls.map((url, i) => (
                  <img key={i} src={url} alt={`Exterior ${i + 1}`} />
                ))
              ) : (
                <div className="photo-placeholder">No exterior photos</div>
              )}
            </div>
          </div>

          {/* Description */}
          {property.description && (
            <div className="detail-section">
              <div className="detail-section-title">Description</div>
              <p style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{property.description}</p>
            </div>
          )}

          {/* Amenities */}
          {property.amenities && (
            <div className="detail-section">
              <div className="detail-section-title">Amenities</div>
              <p style={{ fontSize: '0.875rem' }}>{property.amenities}</p>
            </div>
          )}

          {/* Internal Notes */}
          {property.internal_notes && (
            <div className="detail-section" style={{ borderColor: 'var(--color-warning)', borderWidth: 2 }}>
              <div className="detail-section-title">
                <span className="internal-marker">🔒 Internal Notes</span>
              </div>
              <p style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{property.internal_notes}</p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div>
          {/* Property details */}
          <div className="detail-section">
            <div className="detail-section-title">Property Details</div>
            <div className="detail-field">
              <span className="detail-field-label">Type</span>
              <span className="detail-field-value">{property.property_type}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Configuration</span>
              <span className="detail-field-value">{property.configuration ?? '—'}</span>
            </div>
            {property.land_type && (
              <div className="detail-field">
                <span className="detail-field-label">Land Type</span>
                <span className="detail-field-value">{property.land_type}</span>
              </div>
            )}
            <div className="detail-field">
              <span className="detail-field-label">Carpet Area</span>
              <span className="detail-field-value">{property.carpet_area_sqft ? `${property.carpet_area_sqft} sq.ft` : '—'}</span>
            </div>
            {property.builtup_area_sqft && (
              <div className="detail-field">
                <span className="detail-field-label">Builtup Area</span>
                <span className="detail-field-value">{property.builtup_area_sqft} sq.ft</span>
              </div>
            )}
            {property.plot_area_sqft && (
              <div className="detail-field">
                <span className="detail-field-label">Plot Area</span>
                <span className="detail-field-value">{property.plot_area_sqft} sq.ft</span>
              </div>
            )}
            <div className="detail-field">
              <span className="detail-field-label">Furnishing</span>
              <span className="detail-field-value">{property.furnishing ?? '—'}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Facing</span>
              <span className="detail-field-value">{property.facing ?? '—'}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Age</span>
              <span className="detail-field-value">{property.age_of_property ?? '—'}</span>
            </div>
          </div>

          {/* Pricing */}
          <div className="detail-section">
            <div className="detail-section-title">Pricing</div>
            <div className="detail-field">
              <span className="detail-field-label">Asking Price</span>
              <span className="detail-field-value" style={{ fontSize: '1.125rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                {formatPrice(property.asking_price)}
              </span>
            </div>
            {property.price_per_sqft && (
              <div className="detail-field">
                <span className="detail-field-label">Price / sq.ft</span>
                <span className="detail-field-value">₹{property.price_per_sqft.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          {/* Owner Info */}
          <div className="detail-section">
            <div className="detail-section-title">
              <span className="internal-marker">🔒 Owner Info (Internal)</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Name</span>
              <span className="detail-field-value">{property.owner_name ?? '—'}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Phone</span>
              <span className="detail-field-value">{property.owner_phone ?? '—'}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Email</span>
              <span className="detail-field-value">{property.owner_email ?? '—'}</span>
            </div>
          </div>

          {/* Source */}
          <div className="detail-section">
            <div className="detail-section-title">
              <span className="internal-marker">🔒 Source (Internal)</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Source</span>
              <span className="detail-field-value">{property.source ?? '—'}</span>
            </div>
            {property.source_details && (
              <div className="detail-field">
                <span className="detail-field-label">Details</span>
                <span className="detail-field-value">{property.source_details}</span>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="detail-section">
            <div className="detail-section-title">Metadata</div>
            <div className="detail-field">
              <span className="detail-field-label">Added</span>
              <span className="detail-field-value">{new Date(property.created_at).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="detail-field">
              <span className="detail-field-label">Updated</span>
              <span className="detail-field-value">{new Date(property.updated_at).toLocaleDateString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="modal-overlay" onClick={() => setShowWarningModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title" style={{ color: 'var(--color-warning)' }}>
              ⚠️ Description may contain identifiable info
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 12 }}>The property description may contain information that could identify the property:</p>
              <ul style={{ paddingLeft: 20 }}>
                {exportWarnings.map((w, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{w}</li>
                ))}
              </ul>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setShowWarningModal(false);
                  router.push(`/properties/${id}/edit`);
                }}
              >
                Edit Description
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  setShowWarningModal(false);
                  setExporting(true);
                  const res = await fetch(`/api/properties/${id}/export-data`);
                  const data = await res.json();
                  await generatePdf(data);
                  setExporting(false);
                }}
              >
                Export Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
