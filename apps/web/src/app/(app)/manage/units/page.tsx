'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../lib/auth-context';
import { createClient } from '../../../../lib/supabase-browser';

interface Residency {
  id: string;
  user_id: string;
  resident_type: string;
  starts_at: string;
  ends_at: string | null;
  is_current: boolean;
  user: { full_name: string; email: string } | null;
}

interface Unit {
  id: string;
  unit_number: string;
  floor: string | null;
  unit_type: string | null;
  bedrooms: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  residencies: Residency[];
}

const UNIT_TYPES = [
  { value: '', label: 'Not specified' },
  { value: 'studio', label: 'Studio' },
  { value: 'one_bed', label: '1 Bed' },
  { value: 'two_bed', label: '2 Bed' },
  { value: 'three_bed', label: '3 Bed' },
  { value: 'four_bed_plus', label: '4+ Bed' },
  { value: 'penthouse', label: 'Penthouse' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'parking', label: 'Parking' },
  { value: 'storage', label: 'Storage' },
  { value: 'other', label: 'Other' },
];

const TYPE_COLORS: Record<string, string> = {
  studio: '#06B6D4',
  one_bed: '#10B981',
  two_bed: '#3B82F6',
  three_bed: '#8B5CF6',
  four_bed_plus: '#EC4899',
  penthouse: '#F59E0B',
  commercial: '#F97316',
  parking: '#64748B',
  storage: '#64748B',
  other: '#64748B',
};

export default function ManageUnitsPage() {
  const { activeMembership, isAdmin } = useAuth();
  const supabase = createClient();
  const communityId = activeMembership?.community_id;

  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  // Form state
  const [formUnitNumber, setFormUnitNumber] = useState('');
  const [formFloor, setFormFloor] = useState('');
  const [formUnitType, setFormUnitType] = useState('');
  const [formBedrooms, setFormBedrooms] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Filter
  const [filterFloor, setFilterFloor] = useState('all');
  const [filterOccupancy, setFilterOccupancy] = useState<'all' | 'occupied' | 'vacant'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUnits = useCallback(async () => {
    if (!communityId) return;
    const { data } = await supabase
      .from('units')
      .select('*, residencies(id, user_id, resident_type, starts_at, ends_at, is_current, user:users(full_name, email))')
      .eq('community_id', communityId)
      .order('unit_number');
    if (data) setUnits(data);
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const openCreateForm = () => {
    setEditingUnit(null);
    setFormUnitNumber('');
    setFormFloor('');
    setFormUnitType('');
    setFormBedrooms('');
    setFormNotes('');
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (unit: Unit) => {
    setEditingUnit(unit);
    setFormUnitNumber(unit.unit_number);
    setFormFloor(unit.floor || '');
    setFormUnitType(unit.unit_type || '');
    setFormBedrooms(unit.bedrooms?.toString() || '');
    setFormNotes(unit.notes || '');
    setFormError('');
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingUnit(null);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    const payload = {
      community_id: communityId,
      unit_number: formUnitNumber.trim(),
      floor: formFloor.trim() || null,
      unit_type: formUnitType || null,
      bedrooms: formBedrooms ? parseInt(formBedrooms) : null,
      notes: formNotes.trim() || null,
    };

    if (editingUnit) {
      const { error } = await supabase
        .from('units')
        .update(payload)
        .eq('id', editingUnit.id);

      if (error) {
        setFormError(error.message.includes('unique')
          ? 'A unit with this number already exists in this community.'
          : error.message);
        setFormSubmitting(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from('units')
        .insert(payload);

      if (error) {
        setFormError(error.message.includes('unique')
          ? 'A unit with this number already exists in this community.'
          : error.message);
        setFormSubmitting(false);
        return;
      }
    }

    setFormSubmitting(false);
    resetForm();
    fetchUnits();
  };

  const handleToggleActive = async (unit: Unit) => {
    await supabase
      .from('units')
      .update({ is_active: !unit.is_active })
      .eq('id', unit.id);
    fetchUnits();
  };

  // Derived data
  const floors = [...new Set(units.map((u) => u.floor).filter(Boolean))] as string[];
  floors.sort();

  const getCurrentResidents = (unit: Unit) =>
    unit.residencies?.filter((r) => r.is_current) || [];

  const isOccupied = (unit: Unit) => getCurrentResidents(unit).length > 0;

  const filteredUnits = units.filter((u) => {
    if (filterFloor !== 'all' && u.floor !== filterFloor) return false;
    if (filterOccupancy === 'occupied' && !isOccupied(u)) return false;
    if (filterOccupancy === 'vacant' && isOccupied(u)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !u.unit_number.toLowerCase().includes(q) &&
        !u.floor?.toLowerCase().includes(q) &&
        !getCurrentResidents(u).some((r) =>
          r.user?.full_name?.toLowerCase().includes(q) ||
          r.user?.email?.toLowerCase().includes(q)
        )
      ) return false;
    }
    return true;
  });

  const stats = {
    total: units.length,
    active: units.filter((u) => u.is_active).length,
    occupied: units.filter((u) => isOccupied(u)).length,
    vacant: units.filter((u) => !isOccupied(u) && u.is_active).length,
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          You don&apos;t have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 24, flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(22px, 4vw, 28px)',
            color: 'var(--text)', marginBottom: 6,
          }}>
            Manage Units
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)',
          }}>
            {activeMembership?.community?.name} · {stats.total} units
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 22px', fontSize: 13 }}
        >
          + Add Unit
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        {[
          { label: 'Total', value: stats.total, color: 'var(--text)' },
          { label: 'Active', value: stats.active, color: 'var(--primary)' },
          { label: 'Occupied', value: stats.occupied, color: 'var(--accent)' },
          { label: 'Vacant', value: stats.vacant, color: 'var(--warning)' },
        ].map((s) => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '14px 16px',
          }}>
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
              color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8,
              marginBottom: 4,
            }}>{s.label}</div>
            <div style={{
              fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700,
              color: s.color,
            }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center',
      }}>
        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search units or residents..."
          style={{
            width: 220, padding: '8px 12px', fontSize: 12,
            borderRadius: 'var(--radius-full)',
          }}
        />

        {/* Floor filter */}
        {floors.length > 1 && (
          <select
            value={filterFloor}
            onChange={(e) => setFilterFloor(e.target.value)}
            style={{
              width: 'auto', padding: '8px 32px 8px 12px', fontSize: 12,
              borderRadius: 'var(--radius-full)',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748B' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
            }}
          >
            <option value="all">All floors</option>
            {floors.map((f) => (
              <option key={f} value={f}>{f} floor</option>
            ))}
          </select>
        )}

        {/* Occupancy filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'occupied', 'vacant'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterOccupancy(f)}
              style={{
                padding: '7px 14px', borderRadius: 'var(--radius-full)',
                border: filterOccupancy === f ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: filterOccupancy === f ? 'var(--primary-glow)' : 'transparent',
                color: filterOccupancy === f ? 'var(--primary)' : 'var(--text-muted)',
                fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <>
          <div onClick={resetForm} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 60, backdropFilter: 'blur(4px)',
          }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 440,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow)',
            zIndex: 61, overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '18px 24px', borderBottom: '1px solid var(--border)',
            }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--text)' }}>
                {editingUnit ? 'Edit Unit' : 'Add New Unit'}
              </h3>
              <button onClick={resetForm} style={{
                width: 30, height: 30, borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>

            <div style={{ padding: '20px 24px 24px' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {formError && (
                  <div style={{
                    background: 'var(--error-bg)',
                    border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)',
                    borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                    fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--error)',
                  }}>{formError}</div>
                )}

                {/* Unit number + Floor row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{
                      fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                      color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                    }}>
                      Unit Number <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formUnitNumber}
                      onChange={(e) => setFormUnitNumber(e.target.value)}
                      placeholder="e.g. Flat 4B"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label style={{
                      fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                      color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                    }}>Floor</label>
                    <input
                      type="text"
                      value={formFloor}
                      onChange={(e) => setFormFloor(e.target.value)}
                      placeholder="e.g. 2nd"
                    />
                  </div>
                </div>

                {/* Type + Bedrooms row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{
                      fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                      color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                    }}>Type</label>
                    <select
                      value={formUnitType}
                      onChange={(e) => setFormUnitType(e.target.value)}
                      style={{
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748B' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 14px center',
                        paddingRight: 36,
                      }}
                    >
                      {UNIT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{
                      fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                      color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                    }}>Bedrooms</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={formBedrooms}
                      onChange={(e) => setFormBedrooms(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label style={{
                    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                    color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                  }}>
                    Notes
                    <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}> (optional)</span>
                  </label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Any additional details about this unit..."
                    rows={2}
                    style={{ resize: 'vertical', minHeight: 60 }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="button" onClick={resetForm} className="btn-secondary" style={{ fontSize: 13 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={formSubmitting} style={{ fontSize: 13 }}>
                    {formSubmitting ? (
                      <span className="animate-spin" style={{
                        display: 'inline-block', width: 18, height: 18,
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white', borderRadius: '50%',
                      }} />
                    ) : (
                      editingUnit ? 'Save Changes' : 'Add Unit'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Units list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div className="animate-spin" style={{
            width: 28, height: 28, border: '3px solid var(--border)',
            borderTopColor: 'var(--primary)', borderRadius: '50%',
          }} />
        </div>
      ) : filteredUnits.length === 0 ? (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏠</div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
            {units.length === 0 ? 'No units yet. Add your first unit to get started!' : 'No units match your filters.'}
          </p>
          {units.length === 0 && (
            <button onClick={openCreateForm} className="btn-primary" style={{ width: 'auto', padding: '10px 22px', fontSize: 13 }}>
              + Add Unit
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredUnits.map((unit) => {
            const residents = getCurrentResidents(unit);
            const occupied = residents.length > 0;
            const expanded = expandedUnit === unit.id;
            const typeColor = TYPE_COLORS[unit.unit_type || ''] || 'var(--text-faint)';
            const pastResidents = unit.residencies?.filter((r) => !r.is_current) || [];

            return (
              <div key={unit.id} style={{
                background: 'var(--surface)',
                border: `1px solid ${!unit.is_active ? 'color-mix(in srgb, var(--error) 30%, var(--border))' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                opacity: unit.is_active ? 1 : 0.6,
              }}>
                {/* Main row */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 18px', cursor: 'pointer',
                    flexWrap: 'wrap',
                  }}
                  onClick={() => setExpandedUnit(expanded ? null : unit.id)}
                >
                  {/* Unit number + floor */}
                  <div style={{ minWidth: 120, flex: '0 0 auto' }}>
                    <div style={{
                      fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700,
                      color: 'var(--text)',
                    }}>
                      {unit.unit_number}
                    </div>
                    {unit.floor && (
                      <div style={{
                        fontFamily: 'var(--font-body)', fontSize: 11,
                        color: 'var(--text-faint)', marginTop: 1,
                      }}>
                        {unit.floor} floor
                      </div>
                    )}
                  </div>

                  {/* Type badge */}
                  {unit.unit_type && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: `color-mix(in srgb, ${typeColor} 15%, transparent)`,
                      color: typeColor, letterSpacing: 0.3,
                    }}>
                      {UNIT_TYPES.find((t) => t.value === unit.unit_type)?.label || unit.unit_type}
                      {unit.bedrooms != null ? ` · ${unit.bedrooms} bed` : ''}
                    </span>
                  )}

                  {/* Residents preview */}
                  <div style={{ flex: 1, minWidth: 100 }}>
                    {occupied ? (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {residents.map((r) => (
                          <span key={r.id} style={{
                            fontFamily: 'var(--font-body)', fontSize: 12,
                            color: 'var(--text-secondary)',
                          }}>
                            {r.user?.full_name || r.user?.email}
                            <span style={{
                              fontSize: 10, color: 'var(--text-faint)', marginLeft: 4,
                            }}>
                              ({r.resident_type.replace(/_/g, ' ')})
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{
                        fontFamily: 'var(--font-body)', fontSize: 12,
                        color: 'var(--warning)', fontStyle: 'italic',
                      }}>
                        Vacant
                      </span>
                    )}
                  </div>

                  {/* Occupancy indicator */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: !unit.is_active ? 'var(--error)' : occupied ? 'var(--primary)' : 'var(--warning)',
                    flexShrink: 0,
                  }} />

                  {/* Expand chevron */}
                  <span style={{
                    fontSize: 10, color: 'var(--text-faint)',
                    transform: expanded ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                    flexShrink: 0,
                  }}>▼</span>
                </div>

                {/* Expanded detail */}
                {expanded && (
                  <div style={{
                    borderTop: '1px solid var(--border)',
                    padding: '16px 18px',
                    background: 'var(--surface-alt)',
                  }}>
                    {/* Actions row */}
                    <div style={{
                      display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap',
                    }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditForm(unit); }}
                        style={{
                          padding: '6px 14px', borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)', background: 'var(--surface)',
                          color: 'var(--text-secondary)', fontFamily: 'var(--font-body)',
                          fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleActive(unit); }}
                        style={{
                          padding: '6px 14px', borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${unit.is_active ? 'color-mix(in srgb, var(--error) 30%, transparent)' : 'color-mix(in srgb, var(--primary) 30%, transparent)'}`,
                          background: 'transparent',
                          color: unit.is_active ? 'var(--error)' : 'var(--primary)',
                          fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {unit.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>

                    {/* Unit details */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: 10, marginBottom: 16,
                    }}>
                      {[
                        { label: 'Type', value: UNIT_TYPES.find((t) => t.value === unit.unit_type)?.label || '—' },
                        { label: 'Floor', value: unit.floor || '—' },
                        { label: 'Bedrooms', value: unit.bedrooms != null ? unit.bedrooms.toString() : '—' },
                        { label: 'Status', value: unit.is_active ? 'Active' : 'Inactive' },
                      ].map((d) => (
                        <div key={d.label}>
                          <div style={{
                            fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
                            color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8,
                            marginBottom: 3,
                          }}>{d.label}</div>
                          <div style={{
                            fontFamily: 'var(--font-body)', fontSize: 13,
                            color: 'var(--text)',
                          }}>{d.value}</div>
                        </div>
                      ))}
                    </div>

                    {unit.notes && (
                      <div style={{
                        background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
                        padding: '10px 12px', marginBottom: 16,
                        border: '1px solid var(--border)',
                      }}>
                        <div style={{
                          fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
                          color: 'var(--text-faint)', textTransform: 'uppercase',
                          letterSpacing: 0.8, marginBottom: 4,
                        }}>Notes</div>
                        <div style={{
                          fontFamily: 'var(--font-body)', fontSize: 12,
                          color: 'var(--text-secondary)', lineHeight: 1.5,
                        }}>{unit.notes}</div>
                      </div>
                    )}

                    {/* Current residents */}
                    <div style={{ marginBottom: pastResidents.length > 0 ? 16 : 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
                        color: 'var(--text-faint)', textTransform: 'uppercase',
                        letterSpacing: 0.8, marginBottom: 8,
                      }}>
                        Current Residents ({residents.length})
                      </div>
                      {residents.length === 0 ? (
                        <p style={{
                          fontFamily: 'var(--font-body)', fontSize: 12,
                          color: 'var(--text-faint)', fontStyle: 'italic',
                        }}>No current residents</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {residents.map((r) => (
                            <div key={r.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '8px 12px', background: 'var(--surface)',
                              borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                            }}>
                              <div>
                                <div style={{
                                  fontFamily: 'var(--font-body)', fontSize: 13,
                                  fontWeight: 600, color: 'var(--text)',
                                }}>{r.user?.full_name || 'Unknown'}</div>
                                <div style={{
                                  fontFamily: 'var(--font-body)', fontSize: 11,
                                  color: 'var(--text-faint)',
                                }}>{r.user?.email}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{
                                  fontSize: 10, fontWeight: 600, padding: '3px 8px',
                                  borderRadius: 'var(--radius-full)',
                                  background: r.resident_type === 'owner'
                                    ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
                                    : 'var(--primary-glow)',
                                  color: r.resident_type === 'owner'
                                    ? 'var(--accent)' : 'var(--primary)',
                                }}>
                                  {r.resident_type.replace(/_/g, ' ')}
                                </span>
                                <div style={{
                                  fontSize: 10, color: 'var(--text-faint)', marginTop: 3,
                                }}>
                                  Since {new Date(r.starts_at).toLocaleDateString('en-GB', {
                                    month: 'short', year: 'numeric',
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Past residents */}
                    {pastResidents.length > 0 && (
                      <div>
                        <div style={{
                          fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
                          color: 'var(--text-faint)', textTransform: 'uppercase',
                          letterSpacing: 0.8, marginBottom: 8,
                        }}>
                          Past Residents ({pastResidents.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {pastResidents.map((r) => (
                            <div key={r.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '8px 12px', background: 'var(--surface)',
                              borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                              opacity: 0.6,
                            }}>
                              <div style={{
                                fontFamily: 'var(--font-body)', fontSize: 12,
                                color: 'var(--text-muted)',
                              }}>
                                {r.user?.full_name || 'Unknown'}
                              </div>
                              <div style={{
                                fontSize: 10, color: 'var(--text-faint)',
                              }}>
                                {new Date(r.starts_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                {' → '}
                                {r.ends_at
                                  ? new Date(r.ends_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                                  : '?'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}