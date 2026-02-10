'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { createClient } from '../../../lib/supabase-browser';

interface Contact {
  id: string;
  name: string;
  role_title: string | null;
  phone: string | null;
  email: string | null;
  category: string;
  is_emergency: boolean;
  sort_order: number;
  created_at: string;
}

const CATEGORIES = [
  { value: 'management', label: 'Management', icon: '🏢', color: 'var(--primary)' },
  { value: 'emergency', label: 'Emergency', icon: '🚨', color: 'var(--error)' },
  { value: 'maintenance', label: 'Maintenance', icon: '🔧', color: 'var(--warning)' },
  { value: 'council', label: 'Council', icon: '🏛', color: 'var(--accent)' },
  { value: 'utility', label: 'Utilities', icon: '⚡', color: '#06B6D4' },
  { value: 'other', label: 'Other', icon: '📇', color: 'var(--text-muted)' },
];

function getCategoryInfo(cat: string) {
  return CATEGORIES.find((c) => c.value === cat) || CATEGORIES[CATEGORIES.length - 1];
}

export default function ContactsPage() {
  const { activeMembership, isAdmin } = useAuth();
  const supabase = createClient();
  const communityId = activeMembership?.community_id;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCategory, setFormCategory] = useState('management');
  const [formEmergency, setFormEmergency] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  const fetchContacts = useCallback(async () => {
    if (!communityId) return;
    const { data } = await supabase
      .from('contacts')
      .select('*')
      .eq('community_id', communityId)
      .order('is_emergency', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (data) setContacts(data);
    setLoading(false);
  }, [communityId]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const openCreateForm = () => {
    setEditingContact(null);
    setFormName(''); setFormRole(''); setFormPhone(''); setFormEmail('');
    setFormCategory('management'); setFormEmergency(false); setFormError('');
    setShowForm(true);
  };

  const openEditForm = (contact: Contact) => {
    setEditingContact(contact);
    setFormName(contact.name); setFormRole(contact.role_title || '');
    setFormPhone(contact.phone || ''); setFormEmail(contact.email || '');
    setFormCategory(contact.category); setFormEmergency(contact.is_emergency);
    setFormError('');
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false); setEditingContact(null); setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    const payload = {
      community_id: communityId,
      name: formName.trim(),
      role_title: formRole.trim() || null,
      phone: formPhone.trim() || null,
      email: formEmail.trim() || null,
      category: formCategory,
      is_emergency: formEmergency,
    };

    if (editingContact) {
      const { error } = await supabase.from('contacts').update(payload).eq('id', editingContact.id);
      if (error) { setFormError(error.message); setFormSubmitting(false); return; }
    } else {
      const { error } = await supabase.from('contacts').insert(payload);
      if (error) { setFormError(error.message); setFormSubmitting(false); return; }
    }

    setFormSubmitting(false);
    resetForm();
    fetchContacts();
  };

  const handleDelete = async (contactId: string) => {
    if (!confirm('Delete this contact?')) return;
    await supabase.from('contacts').delete().eq('id', contactId);
    fetchContacts();
  };

  // Filter
  const filteredContacts = contacts.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) ||
      c.role_title?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      getCategoryInfo(c.category).label.toLowerCase().includes(q);
  });

  const emergencyContacts = filteredContacts.filter((c) => c.is_emergency);
  const regularContacts = filteredContacts.filter((c) => !c.is_emergency);

  // Group regular contacts by category
  const groupedContacts: Record<string, Contact[]> = {};
  regularContacts.forEach((c) => {
    if (!groupedContacts[c.category]) groupedContacts[c.category] = [];
    groupedContacts[c.category].push(c);
  });

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--text)', marginBottom: 6 }}>Contacts</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
            Important contacts for {activeMembership?.community?.name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search contacts..."
            style={{ width: 200, padding: '8px 12px', fontSize: 12, borderRadius: 'var(--radius-full)' }}
          />
          {isAdmin && (
            <button onClick={openCreateForm} className="btn-primary" style={{ width: 'auto', padding: '8px 18px', fontSize: 12 }}>
              + Add Contact
            </button>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <>
          <div onClick={resetForm} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow)', zIndex: 61 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--text)' }}>
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </h3>
              <button onClick={resetForm} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {formError && <div style={{ background: 'var(--error-bg)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--error)' }}>{formError}</div>}

              {/* Name + Role */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
                    Name <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. John Smith" required autoFocus />
                </div>
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Role / Title</label>
                  <input type="text" value={formRole} onChange={(e) => setFormRole(e.target.value)} placeholder="e.g. Building Manager" />
                </div>
              </div>

              {/* Phone + Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Phone</label>
                  <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="020 1234 5678" />
                </div>
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Email</label>
                  <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="john@example.com" />
                </div>
              </div>

              {/* Category */}
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Category</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {CATEGORIES.map((cat) => (
                    <button key={cat.value} type="button" onClick={() => setFormCategory(cat.value)} style={{
                      padding: '8px 10px', borderRadius: 'var(--radius-md)',
                      border: formCategory === cat.value ? `2px solid ${cat.color}` : '1px solid var(--border)',
                      background: formCategory === cat.value ? `color-mix(in srgb, ${cat.color} 10%, transparent)` : 'var(--surface-alt)',
                      cursor: 'pointer', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 16, marginBottom: 2 }}>{cat.icon}</div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, color: formCategory === cat.value ? cat.color : 'var(--text-muted)' }}>{cat.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Emergency toggle */}
              <div>
                <button type="button" onClick={() => setFormEmergency(!formEmergency)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '12px 14px', borderRadius: 'var(--radius-md)',
                  border: formEmergency ? '2px solid var(--error)' : '1px solid var(--border)',
                  background: formEmergency ? 'var(--error-bg)' : 'var(--surface-alt)',
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  <div style={{
                    width: 32, height: 18, borderRadius: 9,
                    background: formEmergency ? 'var(--error)' : 'var(--border)',
                    position: 'relative', transition: 'background 0.2s ease', flexShrink: 0,
                  }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%', background: 'white',
                      position: 'absolute', top: 2,
                      left: formEmergency ? 16 : 2,
                      transition: 'left 0.2s ease',
                    }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: formEmergency ? 'var(--error)' : 'var(--text)' }}>Emergency Contact</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-faint)' }}>Highlighted at the top of the page</div>
                  </div>
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={resetForm} className="btn-secondary" style={{ fontSize: 13 }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={formSubmitting} style={{ fontSize: 13 }}>
                  {formSubmitting ? 'Saving...' : editingContact ? 'Save Changes' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Emergency Contacts Banner */}
      {emergencyContacts.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--error) 12%, var(--surface)), color-mix(in srgb, var(--warning) 8%, var(--surface)))',
          border: '1px solid color-mix(in srgb, var(--error) 25%, var(--border))',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 20px', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>🚨</span>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15, color: 'var(--error)' }}>Emergency Contacts</h3>
          </div>
          <div className="contacts-emergency-grid">
            {emergencyContacts.map((contact) => (
              <div key={contact.id} style={{
                background: 'var(--surface)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)', padding: '14px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                gap: 10,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{contact.name}</div>
                  {contact.role_title && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 8 }}>{contact.role_title}</div>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
                        📞 {contact.phone}
                      </a>
                    )}
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none', wordBreak: 'break-all' }}>
                        ✉️ {contact.email}
                      </a>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => openEditForm(contact)} style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
                    <button onClick={() => handleDelete(contact.id)} style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Contacts by Category */}
      {Object.keys(groupedContacts).length === 0 && emergencyContacts.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📇</div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>No contacts yet.</p>
          {isAdmin && (
            <button onClick={openCreateForm} className="btn-primary" style={{ width: 'auto', padding: '10px 22px', fontSize: 13 }}>+ Add Contact</button>
          )}
        </div>
      ) : (
        <div className="contacts-category-grid">
          {CATEGORIES.filter((cat) => groupedContacts[cat.value]?.length > 0).map((cat) => {
            const catContacts = groupedContacts[cat.value];
            return (
              <div key={cat.value} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', overflow: 'hidden',
              }}>
                {/* Category header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  background: `color-mix(in srgb, ${cat.color} 6%, var(--surface))`,
                }}>
                  <span style={{ fontSize: 16 }}>{cat.icon}</span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, color: cat.color }}>{cat.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-faint)', marginLeft: 'auto' }}>{catContacts.length}</span>
                </div>

                {/* Contact cards */}
                <div style={{ padding: '8px 10px' }}>
                  {catContacts.map((contact, idx) => (
                    <div key={contact.id} style={{
                      padding: '12px 8px',
                      borderBottom: idx < catContacts.length - 1 ? '1px solid var(--border)' : 'none',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 1 }}>{contact.name}</div>
                        {contact.role_title && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 6 }}>{contact.role_title}</div>}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '4px 10px', borderRadius: 'var(--radius-full)',
                              background: 'var(--primary-glow)', fontSize: 12, fontWeight: 600,
                              color: 'var(--primary)', textDecoration: 'none',
                            }}>
                              📞 {contact.phone}
                            </a>
                          )}
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '4px 10px', borderRadius: 'var(--radius-full)',
                              background: 'var(--surface-alt)', border: '1px solid var(--border)',
                              fontSize: 11, color: 'var(--text-secondary)', textDecoration: 'none',
                              wordBreak: 'break-all',
                            }}>
                              ✉️ {contact.email}
                            </a>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button onClick={() => openEditForm(contact)} style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
                          <button onClick={() => handleDelete(contact.id)} style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}