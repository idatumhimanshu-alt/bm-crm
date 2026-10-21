'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PUNE_AREAS, CONFIGURATIONS, PROPERTY_TYPES, FURNISHING_OPTIONS, STATUSES, MAX_PHOTO_WIDTH, PHOTO_QUALITY } from '@/lib/constants';
import type { PropertyCreateInput, PropertyType, Furnishing, Status } from '@/lib/types';

/**
 * Client-side image compression via Canvas API.
 * Resizes to max 1200px width, converts to 80% JPEG.
 */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > MAX_PHOTO_WIDTH) {
        height = Math.round((height * MAX_PHOTO_WIDTH) / width);
        width = MAX_PHOTO_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context failed'));
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Compression failed'));
        },
        'image/jpeg',
        PHOTO_QUALITY
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function AddPropertyPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [form, setForm] = useState<PropertyCreateInput>({
    location_area: '',
    city: 'Pune',
    property_type: 'residential',
    status: 'available',
  });

  // Photo state: [File | null, File | null, File | null] for each type
  const [interiorPhotos, setInteriorPhotos] = useState<(File | null)[]>([null, null, null]);
  const [exteriorPhotos, setExteriorPhotos] = useState<(File | null)[]>([null, null, null]);
  const [interiorPreviews, setInteriorPreviews] = useState<(string | null)[]>([null, null, null]);
  const [exteriorPreviews, setExteriorPreviews] = useState<(string | null)[]>([null, null, null]);

  function updateForm(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value || undefined }));
  }

  function handlePhotoSelect(type: 'interior' | 'exterior', index: number, file: File | null) {
    if (!file) return;
    const photos = type === 'interior' ? [...interiorPhotos] : [...exteriorPhotos];
    const previews = type === 'interior' ? [...interiorPreviews] : [...exteriorPreviews];

    photos[index] = file;
    previews[index] = URL.createObjectURL(file);

    if (type === 'interior') {
      setInteriorPhotos(photos);
      setInteriorPreviews(previews);
    } else {
      setExteriorPhotos(photos);
      setExteriorPreviews(previews);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!form.location_area) {
      setError('Location area is required');
      return;
    }
    if (!form.property_type) {
      setError('Property type is required');
      return;
    }

    setSaving(true);

    try {
      // 1. Create the property
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create property');
      }

      const property = await res.json();

      // 2. Upload photos
      const uploadPhoto = async (type: 'interior' | 'exterior', index: number, file: File) => {
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append('type', type);
        formData.append('index', String(index));
        formData.append('file', compressed, `${type}_${index + 1}.jpg`);

        await fetch(`/api/properties/${property.id}/photos`, {
          method: 'POST',
          body: formData,
        });
      };

      const photoUploads: Promise<void>[] = [];

      interiorPhotos.forEach((file, i) => {
        if (file) photoUploads.push(uploadPhoto('interior', i, file));
      });

      exteriorPhotos.forEach((file, i) => {
        if (file) photoUploads.push(uploadPhoto('exterior', i, file));
      });

      if (photoUploads.length > 0) {
        await Promise.all(photoUploads);
      }

      // 3. Navigate to detail page
      router.push(`/properties/${property.id}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <button className="btn btn-outline btn-sm" onClick={() => router.back()} style={{ marginBottom: 16 }}>
        ← Back
      </button>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 24 }}>Add New Property</h1>

      {error && (
        <div style={{ padding: '8px 16px', background: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius)', marginBottom: 16, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Location */}
        <div className="detail-section">
          <div className="detail-section-title">Location</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Area <span className="required">*</span></label>
              <select
                className="form-select"
                value={form.location_area}
                onChange={e => updateForm('location_area', e.target.value)}
                required
              >
                <option value="">Select area</option>
                {PUNE_AREAS.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-input" value={form.city ?? 'Pune'} onChange={e => updateForm('city', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Exact Address 🔒</label>
              <input className="form-input" value={form.exact_address ?? ''} onChange={e => updateForm('exact_address', e.target.value)} placeholder="Not shared in PDF" />
            </div>
            <div className="form-group">
              <label className="form-label">Building Name 🔒</label>
              <input className="form-input" value={form.building_name ?? ''} onChange={e => updateForm('building_name', e.target.value)} placeholder="Not shared in PDF" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Floor 🔒</label>
              <input className="form-input" value={form.floor ?? ''} onChange={e => updateForm('floor', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Unit Number 🔒</label>
              <input className="form-input" value={form.unit_number ?? ''} onChange={e => updateForm('unit_number', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="detail-section">
          <div className="detail-section-title">Property Details</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Property Type <span className="required">*</span></label>
              <select
                className="form-select"
                value={form.property_type}
                onChange={e => updateForm('property_type', e.target.value)}
                required
              >
                {PROPERTY_TYPES.map(pt => (
                  <option key={pt.value} value={pt.value}>{pt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Configuration</label>
              <select className="form-select" value={form.configuration ?? ''} onChange={e => updateForm('configuration', e.target.value)}>
                <option value="">Select config</option>
                {CONFIGURATIONS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Land Type</label>
              <select className="form-select" value={form.land_type ?? ''} onChange={e => updateForm('land_type', e.target.value)}>
                <option value="">Select</option>
                <option value="NA">NA</option>
                <option value="Agricultural">Agricultural</option>
                <option value="CTS">CTS</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Furnishing</label>
              <select className="form-select" value={form.furnishing ?? ''} onChange={e => updateForm('furnishing', e.target.value)}>
                <option value="">Select</option>
                {FURNISHING_OPTIONS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Carpet Area (sq.ft)</label>
              <input type="number" className="form-input" value={form.carpet_area_sqft ?? ''} onChange={e => updateForm('carpet_area_sqft', e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div className="form-group">
              <label className="form-label">Builtup Area (sq.ft)</label>
              <input type="number" className="form-input" value={form.builtup_area_sqft ?? ''} onChange={e => updateForm('builtup_area_sqft', e.target.value ? Number(e.target.value) : undefined)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Plot Area (sq.ft)</label>
              <input type="number" className="form-input" value={form.plot_area_sqft ?? ''} onChange={e => updateForm('plot_area_sqft', e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div className="form-group">
              <label className="form-label">Facing</label>
              <select className="form-select" value={form.facing ?? ''} onChange={e => updateForm('facing', e.target.value)}>
                <option value="">Select</option>
                {['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Age of Property</label>
              <select className="form-select" value={form.age_of_property ?? ''} onChange={e => updateForm('age_of_property', e.target.value)}>
                <option value="">Select</option>
                {['New Construction', 'Under Construction', '0-1 years', '1-5 years', '5-10 years', '10+ years'].map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status ?? 'available'} onChange={e => updateForm('status', e.target.value)}>
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="detail-section">
          <div className="detail-section-title">Pricing</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Asking Price (₹)</label>
              <input type="number" className="form-input" value={form.asking_price ?? ''} onChange={e => updateForm('asking_price', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g. 8500000" />
            </div>
            <div className="form-group">
              <label className="form-label">Price per sq.ft (₹)</label>
              <input type="number" className="form-input" value={form.price_per_sqft ?? ''} onChange={e => updateForm('price_per_sqft', e.target.value ? Number(e.target.value) : undefined)} />
            </div>
          </div>
        </div>

        {/* Description & Amenities */}
        <div className="detail-section">
          <div className="detail-section-title">Description</div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={4} value={form.description ?? ''} onChange={e => updateForm('description', e.target.value)} placeholder="Describe the property..." />
            <div className="form-hint">Avoid including floor, unit, building name, or landmarks — these will trigger a warning during PDF export.</div>
          </div>
          <div className="form-group">
            <label className="form-label">Amenities</label>
            <input className="form-input" value={form.amenities ?? ''} onChange={e => updateForm('amenities', e.target.value)} placeholder="e.g. Parking, Gym, Swimming Pool, Garden" />
            <div className="form-hint">Comma-separated list</div>
          </div>
        </div>

        {/* Owner Info */}
        <div className="detail-section">
          <div className="detail-section-title">
            <span className="internal-marker">🔒 Owner Info (Internal — not shared in PDF)</span>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Owner Name</label>
              <input className="form-input" value={form.owner_name ?? ''} onChange={e => updateForm('owner_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Owner Phone</label>
              <input className="form-input" value={form.owner_phone ?? ''} onChange={e => updateForm('owner_phone', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Owner Email</label>
            <input type="email" className="form-input" value={form.owner_email ?? ''} onChange={e => updateForm('owner_email', e.target.value)} />
          </div>
        </div>

        {/* Source */}
        <div className="detail-section">
          <div className="detail-section-title">
            <span className="internal-marker">🔒 Source (Internal)</span>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Source</label>
              <select className="form-select" value={form.source ?? ''} onChange={e => updateForm('source', e.target.value)}>
                <option value="">Select</option>
                {['Direct', 'Broker', 'Website', 'Referral', 'Walk-in'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Source Details</label>
              <input className="form-input" value={form.source_details ?? ''} onChange={e => updateForm('source_details', e.target.value)} placeholder="e.g. broker name, website URL" />
            </div>
          </div>
        </div>

        {/* Internal Notes */}
        <div className="detail-section">
          <div className="detail-section-title">
            <span className="internal-marker">🔒 Internal Notes</span>
          </div>
          <div className="form-group">
            <textarea className="form-textarea" rows={3} value={form.internal_notes ?? ''} onChange={e => updateForm('internal_notes', e.target.value)} placeholder="Internal notes, not shared with clients..." />
          </div>
        </div>

        {/* Photos */}
        <div className="detail-section">
          <div className="detail-section-title">Interior Photos (max 3)</div>
          <div className="photo-upload-grid">
            {[0, 1, 2].map(i => (
              <label key={i} className="photo-upload-slot">
                {interiorPreviews[i] ? (
                  <img src={interiorPreviews[i]!} alt={`Interior ${i + 1}`} />
                ) : (
                  <>
                    <span className="upload-icon">📷</span>
                    <span className="upload-text">Photo {i + 1}</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => handlePhotoSelect('interior', i, e.target.files?.[0] ?? null)}
                />
              </label>
            ))}
          </div>

          <div className="detail-section-title" style={{ marginTop: 16 }}>Exterior Photos (max 3) 🔒</div>
          <div className="photo-upload-grid">
            {[0, 1, 2].map(i => (
              <label key={i} className="photo-upload-slot">
                {exteriorPreviews[i] ? (
                  <img src={exteriorPreviews[i]!} alt={`Exterior ${i + 1}`} />
                ) : (
                  <>
                    <span className="upload-icon">📷</span>
                    <span className="upload-text">Photo {i + 1}</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => handlePhotoSelect('exterior', i, e.target.files?.[0] ?? null)}
                />
              </label>
            ))}
          </div>
          <div className="form-hint" style={{ marginTop: 8 }}>Photos are compressed automatically before upload (max 1200px width, JPEG 80% quality).</div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
          <button type="button" className="btn btn-outline" onClick={() => router.back()}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Property'}
          </button>
        </div>
      </form>
    </div>
  );
}
