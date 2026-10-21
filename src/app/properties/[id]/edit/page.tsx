'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PUNE_AREAS, CONFIGURATIONS, PROPERTY_TYPES, FURNISHING_OPTIONS, STATUSES, MAX_PHOTO_WIDTH, PHOTO_QUALITY } from '@/lib/constants';
import type { Property, PropertyCreateInput } from '@/lib/types';

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
        (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
        'image/jpeg',
        PHOTO_QUALITY
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function EditPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<PropertyCreateInput>({
    location_area: '',
    property_type: 'residential',
  });

  const [interiorPhotos, setInteriorPhotos] = useState<(File | null)[]>([null, null, null]);
  const [exteriorPhotos, setExteriorPhotos] = useState<(File | null)[]>([null, null, null]);
  const [interiorPreviews, setInteriorPreviews] = useState<(string | null)[]>([null, null, null]);
  const [exteriorPreviews, setExteriorPreviews] = useState<(string | null)[]>([null, null, null]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/properties/${id}`);
        if (!res.ok) throw new Error('Not found');
        const property: Property & { interior_photo_urls: string[]; exterior_photo_urls: string[] } = await res.json();

        setForm({
          location_area: property.location_area,
          city: property.city,
          exact_address: property.exact_address ?? undefined,
          building_name: property.building_name ?? undefined,
          floor: property.floor ?? undefined,
          unit_number: property.unit_number ?? undefined,
          property_type: property.property_type,
          configuration: property.configuration ?? undefined,
          land_type: property.land_type ?? undefined,
          carpet_area_sqft: property.carpet_area_sqft ?? undefined,
          builtup_area_sqft: property.builtup_area_sqft ?? undefined,
          plot_area_sqft: property.plot_area_sqft ?? undefined,
          asking_price: property.asking_price ?? undefined,
          price_per_sqft: property.price_per_sqft ?? undefined,
          furnishing: property.furnishing ?? undefined,
          facing: property.facing ?? undefined,
          age_of_property: property.age_of_property ?? undefined,
          amenities: property.amenities ?? undefined,
          description: property.description ?? undefined,
          owner_name: property.owner_name ?? undefined,
          owner_phone: property.owner_phone ?? undefined,
          owner_email: property.owner_email ?? undefined,
          source: property.source ?? undefined,
          source_details: property.source_details ?? undefined,
          internal_notes: property.internal_notes ?? undefined,
          status: property.status,
        });

        // Set existing photo previews
        const iPreviews = [null, null, null] as (string | null)[];
        property.interior_photo_urls.forEach((url, i) => { if (i < 3) iPreviews[i] = url; });
        setInteriorPreviews(iPreviews);

        const ePreviews = [null, null, null] as (string | null)[];
        property.exterior_photo_urls.forEach((url, i) => { if (i < 3) ePreviews[i] = url; });
        setExteriorPreviews(ePreviews);
      } catch {
        setError('Failed to load property');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function updateForm(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value || undefined }));
  }

  function handlePhotoSelect(type: 'interior' | 'exterior', index: number, file: File | null) {
    if (!file) return;
    const photos = type === 'interior' ? [...interiorPhotos] : [...exteriorPhotos];
    const previews = type === 'interior' ? [...interiorPreviews] : [...exteriorPreviews];
    photos[index] = file;
    previews[index] = URL.createObjectURL(file);
    if (type === 'interior') { setInteriorPhotos(photos); setInteriorPreviews(previews); }
    else { setExteriorPhotos(photos); setExteriorPreviews(previews); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.location_area || !form.property_type) {
      setError('Location area and property type are required');
      return;
    }

    setSaving(true);

    try {
      // Update property
      const res = await fetch(`/api/properties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Failed to update');

      // Upload new photos
      const uploadPhoto = async (type: 'interior' | 'exterior', index: number, file: File) => {
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append('type', type);
        formData.append('index', String(index));
        formData.append('file', compressed, `${type}_${index + 1}.jpg`);
        await fetch(`/api/properties/${id}/photos`, { method: 'POST', body: formData });
      };

      const uploads: Promise<void>[] = [];
      interiorPhotos.forEach((file, i) => { if (file) uploads.push(uploadPhoto('interior', i, file)); });
      exteriorPhotos.forEach((file, i) => { if (file) uploads.push(uploadPhoto('exterior', i, file)); });
      if (uploads.length > 0) await Promise.all(uploads);

      router.push(`/properties/${id}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setSaving(false);
    }
  }

  if (loading) return <div className="loading">Loading property...</div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <button className="btn btn-outline btn-sm" onClick={() => router.back()} style={{ marginBottom: 16 }}>
        ← Back
      </button>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 24 }}>Edit Property</h1>

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
              <select className="form-select" value={form.location_area} onChange={e => updateForm('location_area', e.target.value)} required>
                <option value="">Select area</option>
                {PUNE_AREAS.map(area => <option key={area} value={area}>{area}</option>)}
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
              <input className="form-input" value={form.exact_address ?? ''} onChange={e => updateForm('exact_address', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Building Name 🔒</label>
              <input className="form-input" value={form.building_name ?? ''} onChange={e => updateForm('building_name', e.target.value)} />
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

        {/* Property Details */}
        <div className="detail-section">
          <div className="detail-section-title">Property Details</div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Property Type <span className="required">*</span></label>
              <select className="form-select" value={form.property_type} onChange={e => updateForm('property_type', e.target.value)} required>
                {PROPERTY_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Configuration</label>
              <select className="form-select" value={form.configuration ?? ''} onChange={e => updateForm('configuration', e.target.value)}>
                <option value="">Select</option>
                {CONFIGURATIONS.map(c => <option key={c} value={c}>{c}</option>)}
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
                {FURNISHING_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
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
                {['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Age</label>
              <select className="form-select" value={form.age_of_property ?? ''} onChange={e => updateForm('age_of_property', e.target.value)}>
                <option value="">Select</option>
                {['New Construction', 'Under Construction', '0-1 years', '1-5 years', '5-10 years', '10+ years'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status ?? 'available'} onChange={e => updateForm('status', e.target.value)}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
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
              <input type="number" className="form-input" value={form.asking_price ?? ''} onChange={e => updateForm('asking_price', e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div className="form-group">
              <label className="form-label">Price per sq.ft (₹)</label>
              <input type="number" className="form-input" value={form.price_per_sqft ?? ''} onChange={e => updateForm('price_per_sqft', e.target.value ? Number(e.target.value) : undefined)} />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="detail-section">
          <div className="detail-section-title">Description</div>
          <div className="form-group">
            <textarea className="form-textarea" rows={4} value={form.description ?? ''} onChange={e => updateForm('description', e.target.value)} />
            <div className="form-hint">Avoid floor, unit, building name, or landmarks.</div>
          </div>
          <div className="form-group">
            <label className="form-label">Amenities</label>
            <input className="form-input" value={form.amenities ?? ''} onChange={e => updateForm('amenities', e.target.value)} placeholder="Comma-separated" />
          </div>
        </div>

        {/* Owner */}
        <div className="detail-section">
          <div className="detail-section-title"><span className="internal-marker">🔒 Owner Info</span></div>
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
          <div className="detail-section-title"><span className="internal-marker">🔒 Source</span></div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Source</label>
              <select className="form-select" value={form.source ?? ''} onChange={e => updateForm('source', e.target.value)}>
                <option value="">Select</option>
                {['Direct', 'Broker', 'Website', 'Referral', 'Walk-in'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Source Details</label>
              <input className="form-input" value={form.source_details ?? ''} onChange={e => updateForm('source_details', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Internal Notes */}
        <div className="detail-section">
          <div className="detail-section-title"><span className="internal-marker">🔒 Internal Notes</span></div>
          <div className="form-group">
            <textarea className="form-textarea" rows={3} value={form.internal_notes ?? ''} onChange={e => updateForm('internal_notes', e.target.value)} />
          </div>
        </div>

        {/* Photos */}
        <div className="detail-section">
          <div className="detail-section-title">Interior Photos</div>
          <div className="photo-upload-grid">
            {[0, 1, 2].map(i => (
              <label key={i} className="photo-upload-slot">
                {interiorPreviews[i] ? <img src={interiorPreviews[i]!} alt={`Interior ${i + 1}`} /> : <><span className="upload-icon">📷</span><span className="upload-text">Photo {i + 1}</span></>}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoSelect('interior', i, e.target.files?.[0] ?? null)} />
              </label>
            ))}
          </div>
          <div className="detail-section-title" style={{ marginTop: 16 }}>Exterior Photos 🔒</div>
          <div className="photo-upload-grid">
            {[0, 1, 2].map(i => (
              <label key={i} className="photo-upload-slot">
                {exteriorPreviews[i] ? <img src={exteriorPreviews[i]!} alt={`Exterior ${i + 1}`} /> : <><span className="upload-icon">📷</span><span className="upload-text">Photo {i + 1}</span></>}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handlePhotoSelect('exterior', i, e.target.files?.[0] ?? null)} />
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
          <button type="button" className="btn btn-outline" onClick={() => router.back()}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Update Property'}</button>
        </div>
      </form>
    </div>
  );
}
