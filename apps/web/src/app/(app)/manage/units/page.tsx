'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../lib/auth-context';
import { createClient } from '../../../../lib/supabase-browser';
import ManageUnitTypes from './_components/ManageUnitTypes';

// ============================================================
// TYPES
// ============================================================

interface AttributeField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: string[];
}

interface CommunityUnitType {
  id: string;
  community_id: string;
  name: string;
  category: 'residential' | 'secondary';
  icon: string | null;
  unit_number_label: string;
  attribute_schema: AttributeField[];
  sort_order: number;
  is_active: boolean;
}

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
  unit_type_id: string | null;
  attributes: Record<string, any>;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  unit_type: CommunityUnitType | null;
  residencies: Residency[];
}

// ============================================================
// DYNAMIC ATTRIBUTE FORM
// ============================================================

function AttributeFormFields({
  schema,
  values,
  onChange,
}: {
  schema: AttributeField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  if (!schema || schema.length === 0) return null;

  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
        color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8,
        marginBottom: 10,
      }}>
        Details
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
      }}>
        {schema.map((field) => (
          <div key={field.key}>
            <label style={{
              fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
              color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
            }}>
              {field.label}
            </label>

            {field.type === 'text' && (
              <input
                type="text"
                value={values[field.key] || ''}
                onChange={(e) => onChange(field.key, e.target.value || null)}
                placeholder={field.label}
              />
            )}

            {field.type === 'number' && (
              <input
                type="number"
                value={values[field.key] ?? ''}
                onChange={(e) => onChange(field.key, e.target.value ? Number(e.target.value) : null)}
                placeholder="0"
                min="0"
              />
            )}

            {field.type === 'boolean' && (
              <button
                type="button"
                onClick={() => onChange(field.key, !values[field.key])}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 14px', width: '100%',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: values[field.key]
                    ? 'color-mix(in srgb, var(--primary) 10%, transparent)'
                    : 'var(--surface-alt)',
                  cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 12,
                  color: values[field.key] ? 'var(--primary)' : 'var(--text-muted)',
                }}
              >
                <div style={{
                  width: 32, height: 18, borderRadius: 9,
                  background: values[field.key] ? 'var(--primary)' : 'var(--border)',
                  position: 'relative', flexShrink: 0,
                  transition: 'background 0.2s ease',
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%', background: 'white',
                    position: 'absolute', top: 2,
                    left: values[field.key] ? 16 : 2,
                    transition: 'left 0.2s ease',
                  }} />
                </div>
                {values[field.key] ? 'Yes' : 'No'}
              </button>
            )}

            {field.type === 'select' && (
              <select
                value={values[field.key] || ''}
                onChange={(e) => onChange(field.key, e.target.value || null)}
                style={{
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748B' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  paddingRight: 36,
                }}
              >
                <option value="">Not specified</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ATTRIBUTE DISPLAY (read-only on unit cards)
// ============================================================

function AttributeDisplay({ schema, values }: { schema: AttributeField[]; values: Record<string, any> }) {
  const displayAttrs = schema.filter((f) => {
    const val = values[f.key];
    return val !== null && val !== undefined && val !== '' && val !== false;
  });

  if (displayAttrs.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {displayAttrs.map((f) => {
        const val = values[f.key];
        let display = '';
        if (f.type === 'boolean') display = f.label;
        else if (f.key === 'bedrooms') display = `${val} bed`;
        else if (f.key === 'bathrooms') display = `${val} bath`;
        else display = `${f.label}: ${val}`;

        return (
          <span key={f.key} style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 'var(--radius-sm)',
            background: 'var(--surface-alt)', border: '1px solid var(--border)',
            color: 'var(--text-faint)', fontFamily: 'var(--font-body)',
          }}>
            {display}
          </span>
        );
      })}
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function ManageUnitsPage() {
  const { activeMembership, isAdmin } = useAuth();
  const supabase = createClient();
  const communityId = activeMembership?.community_id;

  const [units, setUnits] = useState<Unit[]>([]);
  const [unitTypes, setUnitTypes] = useState<CommunityUnitType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [showUnitTypes, setShowUnitTypes] = useState(false);

  // Form state
  const [formUnitNumber, setFormUnitNumber] = useState('');
  const [formUnitTypeId, setFormUnitTypeId] = useState('');
  const [formAttributes, setFormAttributes] = useState<Record<string, any>>({});
  const [formNotes, setFormNotes] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Filter
  const [filterTypeId, setFilterTypeId] = useState('all');
  const [filterOccupancy, setFilterOccupancy] = useState<'all' | 'occupied' | 'vacant'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    if (!communityId) return;

    // Fetch community unit types
    const { data: typeData } = await supabase
      .from('community_unit_types')
      .select('*')
      .eq('community_id', communityId)
      .eq('is_active', true)
      .order('sort_order');

    if (typeData) setUnitTypes(typeData);

    // Fetch units with type and residencies
    const { data: unitData } = await supabase
      .from('units')
      .select('*, unit_type:community_unit_types(id, name, category, icon, unit_number_label, attribute_schema, sort_order, is_active), residencies(id, user_id, resident_type, starts_at, ends_at, is_current, user:users(full_name, email))')
      .eq('community_id', communityId)
      .order('unit_number');

    if (unitData) setUnits(unitData);
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get the selected unit type for the form
  const selectedFormType = unitTypes.find((t) => t.id === formUnitTypeId);
  const unitNumberLabel = selectedFormType?.unit_number_label || 'Unit Number';

  const openCreateForm = () => {
    setEditingUnit(null);
    setFormUnitNumber('');
    setFormUnitTypeId(unitTypes[0]?.id || '');
    setFormAttributes({});
    setFormNotes('');
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (unit: Unit) => {
    setEditingUnit(unit);
    setFormUnitNumber(unit.unit_number);
    setFormUnitTypeId(unit.unit_type_id || '');
    setFormAttributes(unit.attributes || {});
    setFormNotes(unit.notes || '');
    setFormError('');
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingUnit(null);
    setFormError('');
  };

  const handleAttributeChange = (key: string, value: any) => {
    setFormAttributes((prev) => {
      const next = { ...prev };
      if (value === null || value === undefined || value === '') {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    // Clean attributes: remove nulls
    const cleanAttrs: Record<string, any> = {};
    for (const [k, v] of Object.entries(formAttributes)) {
      if (v !== null && v !== undefined && v !== '') {
        cleanAttrs[k] = v;
      }
    }

    const payload = {
      community_id: communityId,
      unit_number: formUnitNumber.trim(),
      unit_type_id: formUnitTypeId || null,
      attributes: cleanAttrs,
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
    fetchData();
  };

  const handleToggleActive = async (unit: Unit) => {
    await supabase
      .from('units')
      .update({ is_active: !unit.is_active })
      .eq('id', unit.id);
    fetchData();
  };

  // Derived data
  const getCurrentResidents = (unit: Unit) =>
    unit.residencies?.filter((r) => r.is_current) || [];

  const isOccupied = (unit: Unit) => getCurrentResidents(unit).length > 0;

  const filteredUnits = units.filter((u) => {
    if (filterTypeId !== 'all' && u.unit_type_id !== filterTypeId) return false;
    if (filterOccupancy === 'occupied' && !isOccupied(u)) return false;
    if (filterOccupancy === 'vacant' && isOccupied(u)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !u.unit_number.toLowerCase().includes(q) &&
        !(u.unit_type?.name || '').toLowerCase().includes(q) &&
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
            fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px, 4vw, 28px)',
            color: 'var(--text)', marginBottom: 6,
          }}>
            Manage Units
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
            {activeMembership?.community?.name} · {stats.total} units
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowUnitTypes(true)}
            style={{
              width: 'auto', padding: '10px 18px', fontSize: 13,
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-secondary)',
              fontFamily: 'var(--font-body)', fontWeight: 600, cursor: 'pointer',
            }}>
            Unit Types
          </button>
          <button onClick={openCreateForm} className="btn-primary"
            style={{ width: 'auto', padding: '10px 22px', fontSize: 13 }}>
            + Add Unit
          </button>
        </div>
      </div>

      {/* Unit Types Management Panel */}
      {communityId && (
        <ManageUnitTypes
          communityId={communityId}
          open={showUnitTypes}
          onClose={() => setShowUnitTypes(false)}
          onUpdated={fetchData}
        />
      )}

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
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
              color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4,
            }}>{s.label}</div>
            <div style={{
              fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, color: s.color,
            }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search units or residents..."
          style={{ width: 220, padding: '8px 12px', fontSize: 12, borderRadius: 'var(--radius-full)' }}
        />

        {/* Unit type filter */}
        {unitTypes.length > 1 && (
          <select
            value={filterTypeId}
            onChange={(e) => setFilterTypeId(e.target.value)}
            style={{
              width: 'auto', padding: '8px 32px 8px 12px', fontSize: 12,
              borderRadius: 'var(--radius-full)',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748B' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
            }}
          >
            <option value="all">All types</option>
            {unitTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.icon || ''} {t.name}</option>
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
                fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
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
            transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 480,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow)',
            zIndex: 61, overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '18px 24px', borderBottom: '1px solid var(--border)',
              position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1,
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

                {/* Unit Type selector */}
                <div>
                  <label style={{
                    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                    color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                  }}>
                    Unit Type <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {unitTypes.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setFormUnitTypeId(t.id);
                          // Reset attributes when type changes (keep common ones)
                          if (!editingUnit) setFormAttributes({});
                        }}
                        style={{
                          padding: '8px 14px', borderRadius: 'var(--radius-md)',
                          border: formUnitTypeId === t.id
                            ? '2px solid var(--primary)' : '1px solid var(--border)',
                          background: formUnitTypeId === t.id
                            ? 'var(--primary-glow)' : 'var(--surface-alt)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        {t.icon && <span style={{ fontSize: 14 }}>{t.icon}</span>}
                        <span style={{
                          fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                          color: formUnitTypeId === t.id ? 'var(--primary)' : 'var(--text)',
                        }}>
                          {t.name}
                        </span>
                        <span style={{
                          fontSize: 9, padding: '1px 5px', borderRadius: 'var(--radius-full)',
                          background: t.category === 'residential'
                            ? 'color-mix(in srgb, var(--primary) 15%, transparent)'
                            : 'color-mix(in srgb, var(--accent) 15%, transparent)',
                          color: t.category === 'residential' ? 'var(--primary)' : 'var(--accent)',
                          fontWeight: 600,
                        }}>
                          {t.category === 'residential' ? 'Primary' : 'Secondary'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Unit number */}
                <div>
                  <label style={{
                    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                    color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                  }}>
                    {unitNumberLabel} <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formUnitNumber}
                    onChange={(e) => setFormUnitNumber(e.target.value)}
                    placeholder={`e.g. ${selectedFormType?.category === 'secondary' ? 'Bay 42' : 'Flat 4B'}`}
                    required
                    autoFocus
                  />
                </div>

                {/* Dynamic attribute fields */}
                {selectedFormType && selectedFormType.attribute_schema.length > 0 && (
                  <AttributeFormFields
                    schema={selectedFormType.attribute_schema}
                    values={formAttributes}
                    onChange={handleAttributeChange}
                  />
                )}

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
            <button onClick={openCreateForm} className="btn-primary"
              style={{ width: 'auto', padding: '10px 22px', fontSize: 13 }}>
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
            const pastResidents = unit.residencies?.filter((r) => !r.is_current) || [];
            const typeInfo = unit.unit_type;

            return (
              <div key={unit.id} style={{
                background: 'var(--surface)',
                border: `1px solid ${!unit.is_active ? 'color-mix(in srgb, var(--error) 30%, var(--border))' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)', overflow: 'hidden',
                opacity: unit.is_active ? 1 : 0.6,
              }}>
                {/* Main row */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 18px', cursor: 'pointer', flexWrap: 'wrap',
                  }}
                  onClick={() => setExpandedUnit(expanded ? null : unit.id)}
                >
                  {/* Unit number */}
                  <div style={{ minWidth: 120, flex: '0 0 auto' }}>
                    <div style={{
                      fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700,
                      color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {typeInfo?.icon && <span>{typeInfo.icon}</span>}
                      {unit.unit_number}
                    </div>
                    {typeInfo && (
                      <div style={{
                        fontFamily: 'var(--font-body)', fontSize: 11,
                        color: 'var(--text-faint)', marginTop: 1,
                      }}>
                        {typeInfo.name}
                      </div>
                    )}
                  </div>

                  {/* Attributes summary */}
                  {typeInfo && (
                    <AttributeDisplay
                      schema={typeInfo.attribute_schema || []}
                      values={unit.attributes || {}}
                    />
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
                            <span style={{ fontSize: 10, color: 'var(--text-faint)', marginLeft: 4 }}>
                              ({r.resident_type.replace(/_/g, ' ')})
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{
                        fontFamily: 'var(--font-body)', fontSize: 12,
                        color: 'var(--warning)', fontStyle: 'italic',
                      }}>Vacant</span>
                    )}
                  </div>

                  {/* Occupancy dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: !unit.is_active ? 'var(--error)' : occupied ? 'var(--primary)' : 'var(--warning)',
                    flexShrink: 0,
                  }} />

                  {/* Expand */}
                  <span style={{
                    fontSize: 10, color: 'var(--text-faint)',
                    transform: expanded ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease', flexShrink: 0,
                  }}>▼</span>
                </div>

                {/* Expanded detail */}
                {expanded && (
                  <div style={{
                    borderTop: '1px solid var(--border)', padding: '16px 18px',
                    background: 'var(--surface-alt)',
                  }}>
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditForm(unit); }}
                        style={{
                          padding: '6px 14px', borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)', background: 'var(--surface)',
                          color: 'var(--text-secondary)', fontFamily: 'var(--font-body)',
                          fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}
                      >Edit</button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleActive(unit); }}
                        style={{
                          padding: '6px 14px', borderRadius: 'var(--radius-sm)',
                          border: `1px solid ${unit.is_active ? 'color-mix(in srgb, var(--error) 30%, transparent)' : 'color-mix(in srgb, var(--primary) 30%, transparent)'}`,
                          background: 'transparent',
                          color: unit.is_active ? 'var(--error)' : 'var(--primary)',
                          fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}
                      >{unit.is_active ? 'Deactivate' : 'Reactivate'}</button>
                    </div>

                    {/* Unit details from attributes */}
                    {typeInfo && typeInfo.attribute_schema.length > 0 && (
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: 10, marginBottom: 16,
                      }}>
                        {typeInfo.attribute_schema.map((field: AttributeField) => {
                          const val = unit.attributes?.[field.key];
                          let display = '—';
                          if (val !== null && val !== undefined && val !== '') {
                            if (field.type === 'boolean') display = val ? 'Yes' : 'No';
                            else display = String(val);
                          }
                          return (
                            <div key={field.key}>
                              <div style={{
                                fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
                                color: 'var(--text-faint)', textTransform: 'uppercase',
                                letterSpacing: 0.8, marginBottom: 3,
                              }}>{field.label}</div>
                              <div style={{
                                fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)',
                              }}>{display}</div>
                            </div>
                          );
                        })}
                        <div>
                          <div style={{
                            fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
                            color: 'var(--text-faint)', textTransform: 'uppercase',
                            letterSpacing: 0.8, marginBottom: 3,
                          }}>Status</div>
                          <div style={{
                            fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)',
                          }}>{unit.is_active ? 'Active' : 'Inactive'}</div>
                        </div>
                      </div>
                    )}

                    {unit.notes && (
                      <div style={{
                        background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
                        padding: '10px 12px', marginBottom: 16, border: '1px solid var(--border)',
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
                      }}>Current Residents ({residents.length})</div>
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
                                  color: r.resident_type === 'owner' ? 'var(--accent)' : 'var(--primary)',
                                }}>{r.resident_type.replace(/_/g, ' ')}</span>
                                <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 3 }}>
                                  Since {new Date(r.starts_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
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
                        }}>Past Residents ({pastResidents.length})</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {pastResidents.map((r) => (
                            <div key={r.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '8px 12px', background: 'var(--surface)',
                              borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                              opacity: 0.6,
                            }}>
                              <div style={{
                                fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-muted)',
                              }}>{r.user?.full_name || 'Unknown'}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                                {new Date(r.starts_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                {' → '}
                                {r.ends_at ? new Date(r.ends_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '?'}
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