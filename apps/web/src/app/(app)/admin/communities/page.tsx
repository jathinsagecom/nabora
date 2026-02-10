'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../lib/auth-context';
import { createClient } from '../../../../lib/supabase-browser';

interface Community {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  postcode: string | null;
  description: string | null;
  logo_url: string | null;
  settings: any;
  is_active: boolean;
  created_at: string;
  memberCount?: number;
  unitCount?: number;
}

const THEME_PRESETS = [
  { value: 'midnight-modern', label: 'Midnight Modern', colors: ['#10B981', '#8B5CF6', '#080C15'] },
  { value: 'nordic-calm', label: 'Nordic Calm', colors: ['#3B82F6', '#1E40AF', '#0F172A'] },
  { value: 'garden-fresh', label: 'Garden Fresh', colors: ['#22C55E', '#15803D', '#F0FDF4'] },
  { value: 'warm-earth', label: 'Warm Earth', colors: ['#D97706', '#92400E', '#FEF3C7'] },
];

const FEATURES = [
  { key: 'feed', label: 'Community Feed', desc: 'Posts and announcements', icon: '📰' },
  { key: 'events', label: 'Events', desc: 'Calendar and RSVP', icon: '📅' },
  { key: 'contacts', label: 'Contacts', desc: 'Building contacts directory', icon: '📞' },
  { key: 'tips', label: 'Tips & Guides', desc: 'Helpful resident guides', icon: '💡' },
  { key: 'documents', label: 'Documents', desc: 'Shared files and minutes', icon: '📁' },
  { key: 'facilities', label: 'Facilities', desc: 'Gym, pool, hall bookings', icon: '🏊' },
  { key: 'services', label: 'Services', desc: 'Home services marketplace', icon: '🔧' },
];

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function AdminCommunitiesPage() {
  const { isSuperAdmin } = useAuth();
  const supabase = createClient();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Community | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPostcode, setFormPostcode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTheme, setFormTheme] = useState('midnight-modern');
  const [formFeatures, setFormFeatures] = useState<Record<string, boolean>>({
    feed: true, events: true, contacts: true, tips: true,
    documents: false, facilities: false, services: false,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Detail view
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);

  const fetchCommunities = useCallback(async () => {
    const { data } = await supabase
      .from('communities')
      .select('*')
      .order('created_at', { ascending: true });

    if (data) {
      // Fetch counts
      const enriched = await Promise.all(data.map(async (c) => {
        const { count: memberCount } = await supabase
          .from('user_communities')
          .select('*', { count: 'exact', head: true })
          .eq('community_id', c.id);
        const { count: unitCount } = await supabase
          .from('units')
          .select('*', { count: 'exact', head: true })
          .eq('community_id', c.id)
          .eq('is_active', true);
        return { ...c, memberCount: memberCount || 0, unitCount: unitCount || 0 };
      }));
      setCommunities(enriched);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCommunities(); }, [fetchCommunities]);

  const openCreateForm = () => {
    setEditing(null);
    setFormName(''); setFormSlug(''); setFormAddress(''); setFormPostcode('');
    setFormDescription(''); setFormTheme('midnight-modern');
    setFormFeatures({ feed: true, events: true, contacts: true, tips: true, documents: false, facilities: false, services: false });
    setFormError(''); setShowForm(true);
  };

  const openEditForm = (community: Community) => {
    setEditing(community);
    setFormName(community.name); setFormSlug(community.slug);
    setFormAddress(community.address || ''); setFormPostcode(community.postcode || '');
    setFormDescription(community.description || '');
    setFormTheme(community.settings?.theme?.preset || 'midnight-modern');
    setFormFeatures({
      feed: community.settings?.features?.feed !== false,
      events: community.settings?.features?.events !== false,
      contacts: community.settings?.features?.contacts !== false,
      tips: community.settings?.features?.tips !== false,
      documents: community.settings?.features?.documents === true,
      facilities: community.settings?.features?.facilities === true,
      services: community.settings?.features?.services === true,
    });
    setFormError(''); setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false); setEditing(null); setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    const settings = {
      theme: { preset: formTheme },
      features: formFeatures,
    };

    if (editing) {
      const { error } = await supabase.from('communities').update({
        name: formName.trim(),
        address: formAddress.trim() || null,
        postcode: formPostcode.trim() || null,
        description: formDescription.trim() || null,
        settings,
      }).eq('id', editing.id);
      if (error) { setFormError(error.message); setFormSubmitting(false); return; }
    } else {
      const slug = formSlug.trim() || generateSlug(formName);
      const { error } = await supabase.from('communities').insert({
        name: formName.trim(),
        slug,
        address: formAddress.trim() || null,
        postcode: formPostcode.trim() || null,
        description: formDescription.trim() || null,
        settings,
      });
      if (error) { setFormError(error.message); setFormSubmitting(false); return; }
    }

    setFormSubmitting(false);
    resetForm();
    fetchCommunities();
  };

  const handleToggleActive = async (community: Community) => {
    const action = community.is_active ? 'Deactivate' : 'Reactivate';
    if (!confirm(`${action} ${community.name}?`)) return;
    await supabase.from('communities').update({ is_active: !community.is_active }).eq('id', community.id);
    fetchCommunities();
    if (selectedCommunity?.id === community.id) {
      setSelectedCommunity({ ...selectedCommunity, is_active: !community.is_active });
    }
  };

  const toggleFeature = (key: string) => {
    setFormFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredCommunities = communities.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q) || c.postcode?.toLowerCase().includes(q);
  });

  const activeCommunities = filteredCommunities.filter((c) => c.is_active);
  const inactiveCommunities = filteredCommunities.filter((c) => !c.is_active);

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Super admin access required.</p>
      </div>
    );
  }

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
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--text)', marginBottom: 6 }}>Communities</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
            {communities.length} total · {activeCommunities.length} active
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search communities..." style={{ width: 200, padding: '8px 12px', fontSize: 12, borderRadius: 'var(--radius-full)' }} />
          <button onClick={openCreateForm} className="btn-primary" style={{ width: 'auto', padding: '8px 18px', fontSize: 12 }}>+ New Community</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Communities', value: communities.length, color: 'var(--text)' },
          { label: 'Active', value: activeCommunities.length, color: 'var(--primary)' },
          { label: 'Total Members', value: communities.reduce((s, c) => s + (c.memberCount || 0), 0), color: 'var(--accent)' },
          { label: 'Total Units', value: communities.reduce((s, c) => s + (c.unitCount || 0), 0), color: 'var(--warning)' },
        ].map((s) => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <>
          <div onClick={resetForm} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow)', zIndex: 61 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--text)' }}>
                {editing ? `Edit ${editing.name}` : 'New Community'}
              </h3>
              <button onClick={resetForm} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {formError && <div style={{ background: 'var(--error-bg)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--error)' }}>{formError}</div>}

              {/* Name + Slug */}
              <div style={{ display: 'grid', gridTemplateColumns: editing ? '1fr' : '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
                    Community Name <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input type="text" value={formName} onChange={(e) => { setFormName(e.target.value); if (!editing) setFormSlug(generateSlug(e.target.value)); }} placeholder="e.g. Riverside Court" required autoFocus />
                </div>
                {!editing && (
                  <div>
                    <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
                      Slug <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(URL)</span>
                    </label>
                    <input type="text" value={formSlug} onChange={(e) => setFormSlug(e.target.value)} placeholder="riverside-court" />
                  </div>
                )}
              </div>

              {/* Address + Postcode */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Address</label>
                  <input type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="15 Riverside Walk" />
                </div>
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Postcode</label>
                  <input type="text" value={formPostcode} onChange={(e) => setFormPostcode(e.target.value)} placeholder="SE1 7TJ" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Description</label>
                <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Brief description..." rows={2} style={{ resize: 'vertical', minHeight: 50 }} />
              </div>

              {/* Theme Selector */}
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>Theme Preset</label>
                <div className="admin-theme-grid">
                  {THEME_PRESETS.map((theme) => (
                    <button key={theme.value} type="button" onClick={() => setFormTheme(theme.value)} style={{
                      padding: '12px 14px', borderRadius: 'var(--radius-md)',
                      border: formTheme === theme.value ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: formTheme === theme.value ? 'var(--primary-glow)' : 'var(--surface-alt)',
                      cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {theme.colors.map((c, i) => (
                          <div key={i} style={{ width: 16, height: 16, borderRadius: 'var(--radius-sm)', background: c, border: '1px solid var(--border)' }} />
                        ))}
                      </div>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: formTheme === theme.value ? 'var(--primary)' : 'var(--text)' }}>
                        {theme.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Feature Toggles */}
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>Features</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {FEATURES.map((f) => (
                    <button key={f.key} type="button" onClick={() => toggleFeature(f.key)} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      background: formFeatures[f.key] ? 'color-mix(in srgb, var(--primary) 6%, var(--surface))' : 'var(--surface-alt)',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}>
                      <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{f.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{f.label}</div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-faint)' }}>{f.desc}</div>
                      </div>
                      <div style={{
                        width: 36, height: 20, borderRadius: 10,
                        background: formFeatures[f.key] ? 'var(--primary)' : 'var(--border)',
                        position: 'relative', transition: 'background 0.2s ease', flexShrink: 0,
                      }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%', background: 'white',
                          position: 'absolute', top: 2,
                          left: formFeatures[f.key] ? 18 : 2,
                          transition: 'left 0.2s ease',
                        }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={resetForm} className="btn-secondary" style={{ fontSize: 13 }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={formSubmitting} style={{ fontSize: 13 }}>
                  {formSubmitting ? 'Saving...' : editing ? 'Save Changes' : 'Create Community'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Detail Modal */}
      {selectedCommunity && (
        <>
          <div onClick={() => setSelectedCommunity(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow)', zIndex: 61 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--text)' }}>{selectedCommunity.name}</h3>
              <button onClick={() => setSelectedCommunity(null)} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ padding: '20px 24px 24px' }}>
              {/* Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                {[
                  { label: 'Slug', value: selectedCommunity.slug },
                  { label: 'Status', value: selectedCommunity.is_active ? '🟢 Active' : '🔴 Inactive' },
                  { label: 'Members', value: String(selectedCommunity.memberCount || 0) },
                  { label: 'Units', value: String(selectedCommunity.unitCount || 0) },
                  { label: 'Address', value: selectedCommunity.address || '—' },
                  { label: 'Postcode', value: selectedCommunity.postcode || '—' },
                  { label: 'Theme', value: THEME_PRESETS.find((t) => t.value === selectedCommunity.settings?.theme?.preset)?.label || 'Default' },
                  { label: 'Created', value: new Date(selectedCommunity.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
                ].map((item) => (
                  <div key={item.label}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)' }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Features status */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Features</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {FEATURES.map((f) => {
                    const enabled = selectedCommunity.settings?.features?.[f.key] !== false && ['feed', 'events', 'contacts', 'tips'].includes(f.key) ||
                      selectedCommunity.settings?.features?.[f.key] === true;
                    return (
                      <span key={f.key} style={{
                        fontSize: 11, padding: '4px 10px', borderRadius: 'var(--radius-full)',
                        background: enabled ? 'var(--primary-glow)' : 'var(--surface-alt)',
                        border: `1px solid ${enabled ? 'color-mix(in srgb, var(--primary) 30%, transparent)' : 'var(--border)'}`,
                        color: enabled ? 'var(--primary)' : 'var(--text-faint)',
                        fontWeight: 600,
                      }}>
                        {f.icon} {f.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              {selectedCommunity.description && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Description</div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{selectedCommunity.description}</p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => { setSelectedCommunity(null); openEditForm(selectedCommunity); }} className="btn-primary" style={{ width: 'auto', padding: '10px 20px', fontSize: 12 }}>Edit Community</button>
                <button onClick={() => handleToggleActive(selectedCommunity)} style={{
                  padding: '10px 20px', borderRadius: 'var(--radius-md)',
                  border: `1px solid ${selectedCommunity.is_active ? 'color-mix(in srgb, var(--error) 30%, transparent)' : 'color-mix(in srgb, var(--primary) 30%, transparent)'}`,
                  background: 'transparent',
                  color: selectedCommunity.is_active ? 'var(--error)' : 'var(--primary)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>
                  {selectedCommunity.is_active ? 'Deactivate' : 'Reactivate'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Community Cards */}
      {filteredCommunities.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏘️</div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
            {communities.length === 0 ? 'No communities yet.' : 'No communities match your search.'}
          </p>
          {communities.length === 0 && (
            <button onClick={openCreateForm} className="btn-primary" style={{ width: 'auto', padding: '10px 22px', fontSize: 13 }}>+ Create First Community</button>
          )}
        </div>
      ) : (
        <>
          {/* Active */}
          <div className="admin-community-grid" style={{ marginBottom: inactiveCommunities.length > 0 ? 28 : 0 }}>
            {activeCommunities.map((c) => {
              const theme = THEME_PRESETS.find((t) => t.value === c.settings?.theme?.preset);
              const featureCount = FEATURES.filter((f) => {
                const val = c.settings?.features?.[f.key];
                return val === true || (val !== false && ['feed', 'events', 'contacts', 'tips'].includes(f.key));
              }).length;

              return (
                <div key={c.id} onClick={() => setSelectedCommunity(c)} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', overflow: 'hidden', cursor: 'pointer',
                  transition: 'border-color 0.15s ease',
                }}>
                  {/* Color bar */}
                  <div style={{
                    height: 4,
                    background: theme ? `linear-gradient(90deg, ${theme.colors[0]}, ${theme.colors[1]})` : 'var(--primary)',
                  }} />

                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{c.name}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)' }}>{c.slug}</div>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)', flexShrink: 0 }}>Active</span>
                    </div>

                    {c.address && (
                      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 10 }}>
                        📍 {c.address}{c.postcode ? `, ${c.postcode}` : ''}
                      </div>
                    )}

                    {/* Stats row */}
                    <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
                      {[
                        { label: 'Members', value: c.memberCount, icon: '👥' },
                        { label: 'Units', value: c.unitCount, icon: '🏠' },
                        { label: 'Features', value: featureCount, icon: '⚙️' },
                      ].map((s) => (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12 }}>{s.icon}</span>
                          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{s.value}</span>
                          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{s.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Theme indicator */}
                    {theme && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {theme.colors.map((col, i) => (
                            <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: col, border: '1px solid var(--border)' }} />
                          ))}
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{theme.label}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inactive */}
          {inactiveCommunities.length > 0 && (
            <>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, paddingLeft: 4 }}>
                Inactive ({inactiveCommunities.length})
              </div>
              <div className="admin-community-grid">
                {inactiveCommunities.map((c) => (
                  <div key={c.id} onClick={() => setSelectedCommunity(c)} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', padding: '16px 18px',
                    cursor: 'pointer', opacity: 0.5,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: 'var(--text-muted)' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{c.slug} · {c.memberCount} members</div>
                      </div>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)', background: 'var(--error-bg)', color: 'var(--error)', flexShrink: 0 }}>Inactive</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}