'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PUNE_AREAS, CONFIGURATIONS, STATUSES } from '@/lib/constants';
import type { Property, PaginatedResponse } from '@/lib/types';

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

export default function ListingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters from URL
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [locationArea, setLocationArea] = useState(searchParams.get('location_area') ?? '');
  const [selectedConfigs, setSelectedConfigs] = useState<string[]>(
    searchParams.get('configuration')?.split(',').filter(Boolean) ?? []
  );
  const [budgetMin, setBudgetMin] = useState(searchParams.get('budget_min') ?? '');
  const [budgetMax, setBudgetMax] = useState(searchParams.get('budget_max') ?? '');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    searchParams.get('status')?.split(',').filter(Boolean) ?? ['available', 'under_negotiation']
  );
  const [page, setPage] = useState(Number(searchParams.get('page') ?? '1'));

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();

    if (search) params.set('search', search);
    if (locationArea) params.set('location_area', locationArea);
    if (selectedConfigs.length) params.set('configuration', selectedConfigs.join(','));
    if (budgetMin) params.set('budget_min', budgetMin);
    if (budgetMax) params.set('budget_max', budgetMax);
    if (selectedStatuses.length) params.set('status', selectedStatuses.join(','));
    params.set('page', String(page));

    try {
      const res = await fetch(`/api/properties?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data: PaginatedResponse<Property> = await res.json();
      setProperties(data.data);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, locationArea, selectedConfigs, budgetMin, budgetMax, selectedStatuses, page]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Debounced search
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function toggleConfig(config: string) {
    setSelectedConfigs(prev =>
      prev.includes(config)
        ? prev.filter(c => c !== config)
        : [...prev, config]
    );
    setPage(1);
  }

  function toggleStatus(status: string) {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
    setPage(1);
  }

  return (
    <div>
      {/* Search bar */}
      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search properties by area, type, configuration..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="filters-bar">
        {/* Location */}
        <div className="filter-group">
          <span className="filter-label">Location</span>
          <select
            className="form-select"
            value={locationArea}
            onChange={e => { setLocationArea(e.target.value); setPage(1); }}
          >
            <option value="">All Areas</option>
            {PUNE_AREAS.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>

        {/* Configuration */}
        <div className="filter-group" style={{ flex: 1 }}>
          <span className="filter-label">Configuration</span>
          <div className="checkbox-group">
            {['1BHK', '2BHK', '3BHK', '4BHK', 'Shop', 'Office', 'Plot'].map(config => (
              <label key={config} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedConfigs.includes(config)}
                  onChange={() => toggleConfig(config)}
                />
                {config}
              </label>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div className="filter-group">
          <span className="filter-label">Budget (₹)</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              className="form-input"
              placeholder="Min"
              value={budgetMin}
              onChange={e => { setBudgetMin(e.target.value); setPage(1); }}
              style={{ width: 100 }}
            />
            <input
              type="number"
              className="form-input"
              placeholder="Max"
              value={budgetMax}
              onChange={e => { setBudgetMax(e.target.value); setPage(1); }}
              style={{ width: 100 }}
            />
          </div>
        </div>

        {/* Status */}
        <div className="filter-group">
          <span className="filter-label">Status</span>
          <div className="checkbox-group">
            {STATUSES.map(s => (
              <label key={s.value} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedStatuses.includes(s.value)}
                  onChange={() => toggleStatus(s.value)}
                />
                {s.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 8 }}>
        {loading ? 'Loading...' : `${total} properties found`}
      </div>

      {/* Property grid */}
      {loading ? (
        <div className="loading">Loading properties...</div>
      ) : properties.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No properties found</div>
          <p>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="property-grid">
          {properties.map(prop => (
            <div
              key={prop.id}
              className="property-card"
              onClick={() => router.push(`/properties/${prop.id}`)}
            >
              <div className="property-card-image">
                {(() => {
                  const photos: string[] = JSON.parse(prop.interior_photos || '[]');
                  if (photos.length > 0) {
                    return <img src={`/api/photos/${encodeURIComponent(photos[0])}`} alt="" />;
                  }
                  return 'No photo';
                })()}
              </div>
              <div className="property-card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="property-card-title">
                    {prop.configuration ?? prop.property_type}
                  </div>
                  <StatusBadge status={prop.status} />
                </div>
                <div className="property-card-location">
                  {prop.location_area}, {prop.city}
                </div>
                <div className="property-card-meta">
                  {prop.carpet_area_sqft && <span>{prop.carpet_area_sqft} sq.ft</span>}
                  {prop.furnishing && <span>{prop.furnishing}</span>}
                  {prop.facing && <span>{prop.facing} facing</span>}
                </div>
                <div className="property-card-price">
                  {formatPrice(prop.asking_price)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const pageNum = start + i;
            if (pageNum > totalPages) return null;
            return (
              <button
                key={pageNum}
                className={`pagination-btn ${pageNum === page ? 'active' : ''}`}
                onClick={() => setPage(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            className="pagination-btn"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>

          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
