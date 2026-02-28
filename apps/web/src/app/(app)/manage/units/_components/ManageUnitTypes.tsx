'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../../../../../lib/supabase-browser';

// ============================================================
// TYPES
// ============================================================

interface AttributeField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: string[];
}

export interface CommunityUnitType {
  id: string;
  community_id: string;
  name: string;
  category: 'residential' | 'secondary';
  icon: string | null;
  unit_number_label: string;
  attribute_schema: AttributeField[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface ManageUnitTypesProps {
  communityId: string;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

// ============================================================
// COMMON ICONS
// ============================================================

const ICON_OPTIONS = ['🏠', '🏙️', '🏪', '🅿️', '📦', '🚲', '🏢', '🏘️', '🔑', '🛗'];
const FIELD_TYPES: { value: AttributeField['type']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'select', label: 'Dropdown' },
];

// ============================================================
// ATTRIBUTE SCHEMA BUILDER
// ============================================================

function SchemaBuilder({
  schema,
  onChange,
}: {
  schema: AttributeField[];
  onChange: (schema: AttributeField[]) => void;
}) {
  const addField = () => {
    onChange([...schema, { key: '', label: '', type: 'text' }]);
  };

  const updateField = (index: number, updates: Partial<AttributeField>) => {
    const next = schema.map((f, i) => {
      if (i !== index) return f;
      const updated = { ...f, ...updates };
      // Auto-generate key from label
      if (updates.label !== undefined) {
        updated.key = updates.label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '');
      }
      // Clear options if type is not select
      if (updates.type && updates.type !== 'select') {
        delete updated.options;
      }
      // Add empty options array if switching to select
      if (updates.type === 'select' && !updated.options) {
        updated.options = [''];
      }
      return updated;
    });
    onChange(next);
  };

  const removeField = (index: number) => {
    onChange(schema.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= schema.length) return;
    const next = [...schema];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    onChange(next);
  };

  const updateOption = (fieldIndex: number, optIndex: number, value: string) => {
    const next = [...schema];
    const field = { ...next[fieldIndex] };
    const opts = [...(field.options || [])];
    opts[optIndex] = value;
    field.options = opts;
    next[fieldIndex] = field;
    onChange(next);
  };

  const addOption = (fieldIndex: number) => {
    const next = [...schema];
    const field = { ...next[fieldIndex] };
    field.options = [...(field.options || []), ''];
    next[fieldIndex] = field;
    onChange(next);
  };

  const removeOption = (fieldIndex: number, optIndex: number) => {
    const next = [...schema];
    const field = { ...next[fieldIndex] };
    field.options = (field.options || []).filter((_, i) => i !== optIndex);
    next[fieldIndex] = field;
    onChange(next);
  };

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10,
      }}>
        <label style={{
          fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
          color: 'var(--text-secondary)',
        }}>
          Custom Fields
          <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}> (optional)</span>
        </label>
        <button type="button" onClick={addField} style={{
          padding: '4px 10px', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--primary)', background: 'transparent',
          color: 'var(--primary)', fontSize: 11, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}>
          + Add Field
        </button>
      </div>

      {schema.length === 0 && (
        <div style={{
          padding: '16px', background: 'var(--surface-alt)',
          borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)',
          textAlign: 'center',
        }}>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-faint)',
          }}>
            No custom fields yet. Add fields like &quot;Bedrooms&quot;, &quot;Floor&quot;, &quot;EV Charging&quot; etc.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {schema.map((field, index) => (
          <div key={index} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '12px 14px',
          }}>
            {/* Field header: label + type + actions */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: field.type === 'select' ? 10 : 0 }}>
              {/* Label input */}
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  placeholder="Field name (e.g. Bedrooms)"
                  style={{ fontSize: 12, padding: '7px 10px' }}
                />
              </div>

              {/* Type selector */}
              <select
                value={field.type}
                onChange={(e) => updateField(index, { type: e.target.value as AttributeField['type'] })}
                style={{
                  width: 110, fontSize: 11, padding: '7px 28px 7px 10px',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748B' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
                }}
              >
                {FIELD_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                ))}
              </select>

              {/* Move + Delete */}
              <div style={{ display: 'flex', gap: 2 }}>
                <button type="button" onClick={() => moveField(index, -1)}
                  disabled={index === 0}
                  style={{
                    width: 26, height: 30, borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)', background: 'transparent',
                    color: index === 0 ? 'var(--border)' : 'var(--text-faint)',
                    cursor: index === 0 ? 'default' : 'pointer', fontSize: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>▲</button>
                <button type="button" onClick={() => moveField(index, 1)}
                  disabled={index === schema.length - 1}
                  style={{
                    width: 26, height: 30, borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)', background: 'transparent',
                    color: index === schema.length - 1 ? 'var(--border)' : 'var(--text-faint)',
                    cursor: index === schema.length - 1 ? 'default' : 'pointer', fontSize: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>▼</button>
                <button type="button" onClick={() => removeField(index)}
                  style={{
                    width: 26, height: 30, borderRadius: 'var(--radius-sm)',
                    border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)',
                    background: 'transparent', color: 'var(--error)',
                    cursor: 'pointer', fontSize: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>×</button>
              </div>
            </div>

            {/* Select options */}
            {field.type === 'select' && (
              <div style={{ marginLeft: 0 }}>
                <div style={{
                  fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
                  color: 'var(--text-faint)', textTransform: 'uppercase',
                  letterSpacing: 0.5, marginBottom: 6,
                }}>Dropdown Options</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(field.options || []).map((opt, optIdx) => (
                    <div key={optIdx} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(index, optIdx, e.target.value)}
                        placeholder={`Option ${optIdx + 1}`}
                        style={{ flex: 1, fontSize: 11, padding: '5px 8px' }}
                      />
                      <button type="button" onClick={() => removeOption(index, optIdx)}
                        style={{
                          width: 24, height: 26, borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)', background: 'transparent',
                          color: 'var(--text-faint)', cursor: 'pointer', fontSize: 11,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>×</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addOption(index)}
                    style={{
                      padding: '4px 8px', fontSize: 10, fontWeight: 600,
                      border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)',
                      background: 'transparent', color: 'var(--text-faint)',
                      cursor: 'pointer', fontFamily: 'var(--font-body)',
                      alignSelf: 'flex-start',
                    }}>+ Add Option</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ManageUnitTypes({ communityId, open, onClose, onUpdated }: ManageUnitTypesProps) {
  const supabase = createClient();

  const [unitTypes, setUnitTypes] = useState<CommunityUnitType[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<CommunityUnitType | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'residential' | 'secondary'>('residential');
  const [formIcon, setFormIcon] = useState('🏠');
  const [formUnitNumberLabel, setFormUnitNumberLabel] = useState('Unit Number');
  const [formSchema, setFormSchema] = useState<AttributeField[]>([]);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchTypes = useCallback(async () => {
    const { data } = await supabase
      .from('community_unit_types')
      .select('*')
      .eq('community_id', communityId)
      .order('sort_order');
    if (data) setUnitTypes(data);
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    if (open) fetchTypes();
  }, [open, fetchTypes]);

  const openCreate = () => {
    setEditingType(null);
    setFormName('');
    setFormCategory('residential');
    setFormIcon('🏠');
    setFormUnitNumberLabel('Unit Number');
    setFormSchema([]);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (type: CommunityUnitType) => {
    setEditingType(type);
    setFormName(type.name);
    setFormCategory(type.category);
    setFormIcon(type.icon || '🏠');
    setFormUnitNumberLabel(type.unit_number_label || 'Unit Number');
    setFormSchema(type.attribute_schema || []);
    setFormError('');
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingType(null);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Name is required');
      return;
    }

    // Validate schema: remove fields with empty labels
    const cleanSchema = formSchema
      .filter((f) => f.label.trim())
      .map((f) => ({
        ...f,
        label: f.label.trim(),
        key: f.key || f.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
        options: f.type === 'select' ? (f.options || []).filter((o) => o.trim()) : undefined,
      }));

    setFormSubmitting(true);
    setFormError('');

    const payload = {
      community_id: communityId,
      name: formName.trim(),
      category: formCategory,
      icon: formIcon,
      unit_number_label: formUnitNumberLabel.trim() || 'Unit Number',
      attribute_schema: cleanSchema,
      sort_order: editingType?.sort_order ?? unitTypes.length * 10,
    };

    if (editingType) {
      const { error } = await supabase
        .from('community_unit_types')
        .update(payload)
        .eq('id', editingType.id);

      if (error) {
        setFormError(error.message.includes('unique')
          ? 'A unit type with this name already exists.'
          : error.message);
        setFormSubmitting(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from('community_unit_types')
        .insert(payload);

      if (error) {
        setFormError(error.message.includes('unique')
          ? 'A unit type with this name already exists.'
          : error.message);
        setFormSubmitting(false);
        return;
      }
    }

    setFormSubmitting(false);
    resetForm();
    fetchTypes();
    onUpdated();
  };

  const handleToggleActive = async (type: CommunityUnitType) => {
    await supabase
      .from('community_unit_types')
      .update({ is_active: !type.is_active })
      .eq('id', type.id);
    fetchTypes();
    onUpdated();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 70, backdropFilter: 'blur(4px)',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '100%', maxWidth: 520, background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
        zIndex: 71, display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px', borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--text)' }}>
              Unit Types
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
              Define the types of units in your building
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {!showForm ? (
            <>
              {/* Add button */}
              <button onClick={openCreate} style={{
                width: '100%', padding: '12px', borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--primary)', background: 'transparent',
                color: 'var(--primary)', fontFamily: 'var(--font-body)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                marginBottom: 16,
              }}>
                + Add Unit Type
              </button>

              {/* List */}
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                  <div className="animate-spin" style={{
                    width: 24, height: 24, border: '3px solid var(--border)',
                    borderTopColor: 'var(--primary)', borderRadius: '50%',
                  }} />
                </div>
              ) : unitTypes.length === 0 ? (
                <div style={{
                  padding: '32px 16px', textAlign: 'center',
                  background: 'var(--surface-alt)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
                    No unit types defined yet.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {unitTypes.map((type) => (
                    <div key={type.id} style={{
                      background: 'var(--surface-alt)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', padding: '14px 16px',
                      opacity: type.is_active ? 1 : 0.5,
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginBottom: type.attribute_schema.length > 0 ? 10 : 0,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 20 }}>{type.icon || '🏠'}</span>
                          <div>
                            <div style={{
                              fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
                              color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6,
                            }}>
                              {type.name}
                              <span style={{
                                fontSize: 9, padding: '1px 6px', borderRadius: 'var(--radius-full)',
                                fontWeight: 700,
                                background: type.category === 'residential'
                                  ? 'color-mix(in srgb, var(--primary) 15%, transparent)'
                                  : 'color-mix(in srgb, var(--accent) 15%, transparent)',
                                color: type.category === 'residential' ? 'var(--primary)' : 'var(--accent)',
                              }}>
                                {type.category === 'residential' ? 'Primary' : 'Secondary'}
                              </span>
                              {!type.is_active && (
                                <span style={{
                                  fontSize: 9, padding: '1px 6px', borderRadius: 'var(--radius-full)',
                                  background: 'color-mix(in srgb, var(--error) 15%, transparent)',
                                  color: 'var(--error)', fontWeight: 700,
                                }}>Inactive</span>
                              )}
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-faint)',
                              marginTop: 1,
                            }}>
                              Label: {type.unit_number_label} · {type.attribute_schema.length} field{type.attribute_schema.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => openEdit(type)} style={{
                            padding: '5px 10px', borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)', background: 'transparent',
                            color: 'var(--text-secondary)', fontSize: 10, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'var(--font-body)',
                          }}>Edit</button>
                          <button onClick={() => handleToggleActive(type)} style={{
                            padding: '5px 10px', borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${type.is_active
                              ? 'color-mix(in srgb, var(--error) 30%, transparent)'
                              : 'color-mix(in srgb, var(--primary) 30%, transparent)'}`,
                            background: 'transparent',
                            color: type.is_active ? 'var(--error)' : 'var(--primary)',
                            fontSize: 10, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'var(--font-body)',
                          }}>
                            {type.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </div>

                      {/* Schema preview */}
                      {type.attribute_schema.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {type.attribute_schema.map((field) => (
                            <span key={field.key} style={{
                              fontSize: 10, padding: '2px 7px', borderRadius: 'var(--radius-sm)',
                              background: 'var(--surface)', border: '1px solid var(--border)',
                              color: 'var(--text-faint)', fontFamily: 'var(--font-body)',
                            }}>
                              {field.label}
                              <span style={{ color: 'var(--border)', marginLeft: 3 }}>
                                {field.type === 'text' ? 'Aa' : field.type === 'number' ? '#' : field.type === 'boolean' ? '◉' : '▾'}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Create / Edit Form */
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Back button */}
              <button type="button" onClick={resetForm} style={{
                alignSelf: 'flex-start', padding: '4px 0',
                border: 'none', background: 'transparent',
                color: 'var(--text-faint)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                ← Back to list
              </button>

              <h4 style={{
                fontFamily: 'var(--font-heading)', fontSize: 15, color: 'var(--text)',
              }}>
                {editingType ? `Edit "${editingType.name}"` : 'New Unit Type'}
              </h4>

              {formError && (
                <div style={{
                  background: 'var(--error-bg)',
                  border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)',
                  borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                  fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--error)',
                }}>{formError}</div>
              )}

              {/* Name */}
              <div>
                <label style={{
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                  color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                }}>
                  Name <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Flat, Parking Space, Storage Unit"
                  required
                  autoFocus
                />
              </div>

              {/* Category */}
              <div>
                <label style={{
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                  color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                }}>Category</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([
                    { value: 'residential', label: 'Primary / Residential', desc: 'Flats, houses — the main unit' },
                    { value: 'secondary', label: 'Secondary / Ancillary', desc: 'Parking, storage, bike stores' },
                  ] as const).map((cat) => (
                    <button key={cat.value} type="button"
                      onClick={() => {
                        setFormCategory(cat.value);
                        if (cat.value === 'residential' && formIcon === '🅿️') setFormIcon('🏠');
                        if (cat.value === 'secondary' && formIcon === '🏠') setFormIcon('🅿️');
                      }}
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: 'var(--radius-md)',
                        border: formCategory === cat.value ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: formCategory === cat.value ? 'var(--primary-glow)' : 'var(--surface-alt)',
                        cursor: 'pointer', textAlign: 'left',
                      }}>
                      <div style={{
                        fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
                        color: formCategory === cat.value ? 'var(--primary)' : 'var(--text)',
                      }}>{cat.label}</div>
                      <div style={{
                        fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-faint)', marginTop: 2,
                      }}>{cat.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon */}
              <div>
                <label style={{
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                  color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                }}>Icon</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ICON_OPTIONS.map((icon) => (
                    <button key={icon} type="button" onClick={() => setFormIcon(icon)} style={{
                      width: 36, height: 36, borderRadius: 'var(--radius-md)',
                      border: formIcon === icon ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: formIcon === icon ? 'var(--primary-glow)' : 'var(--surface-alt)',
                      cursor: 'pointer', fontSize: 18,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{icon}</button>
                  ))}
                </div>
              </div>

              {/* Unit number label */}
              <div>
                <label style={{
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                  color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                }}>
                  Unit Number Label
                  <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>
                    {' '}(what admins see when creating units)
                  </span>
                </label>
                <input
                  type="text"
                  value={formUnitNumberLabel}
                  onChange={(e) => setFormUnitNumberLabel(e.target.value)}
                  placeholder="e.g. Flat Number, Bay Number"
                />
              </div>

              {/* Attribute Schema Builder */}
              <SchemaBuilder schema={formSchema} onChange={setFormSchema} />

              {/* Submit */}
              <div style={{ display: 'flex', gap: 10, marginTop: 8, paddingBottom: 16 }}>
                <button type="button" onClick={resetForm} style={{
                  padding: '9px 18px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-muted)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={formSubmitting}
                  style={{ fontSize: 13, width: 'auto', padding: '9px 24px' }}>
                  {formSubmitting ? 'Saving...' : editingType ? 'Save Changes' : 'Create Unit Type'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}