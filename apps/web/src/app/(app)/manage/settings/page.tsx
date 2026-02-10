'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../lib/auth-context';
import { createClient } from '../../../../lib/supabase-browser';

interface CommunityData {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  postcode: string | null;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  settings: {
    theme?: { preset?: string };
    features?: Record<string, boolean>;
  } | null;
  created_at: string;
}

const FEATURE_LABELS: Record<string, { label: string; desc: string; icon: string }> = {
  feed: { label: 'Community Feed', desc: 'Posts, announcements, and updates', icon: '📰' },
  events: { label: 'Events', desc: 'Community events with RSVP', icon: '📅' },
  notices: { label: 'Notice Board', desc: 'Important notices and alerts', icon: '📋' },
  documents: { label: 'Documents', desc: 'Shared files, minutes, and guides', icon: '📁' },
  contacts: { label: 'Contacts', desc: 'Building management and emergency contacts', icon: '📞' },
  services: { label: 'Services', desc: 'Home services marketplace', icon: '🔧' },
  blog: { label: 'Blog', desc: 'Community blog and articles', icon: '✍️' },
};

const THEME_LABELS: Record<string, { label: string; colors: string[] }> = {
  'midnight-modern': { label: 'Midnight Modern', colors: ['#10B981', '#8B5CF6', '#080C15'] },
  'warm-earth': { label: 'Warm Earth', colors: ['#D97706', '#92400E', '#FEF3C7'] },
  'nordic-calm': { label: 'Nordic Calm', colors: ['#3B82F6', '#1E40AF', '#0F172A'] },
  'garden-fresh': { label: 'Garden Fresh', colors: ['#22C55E', '#15803D', '#F0FDF4'] },
};

export default function ManageSettingsPage() {
  const { activeMembership, isAdmin, isSuperAdmin, refresh } = useAuth();
  const supabase = createClient();
  const communityId = activeMembership?.community_id;

  const [community, setCommunity] = useState<CommunityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPostcode, setFormPostcode] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const fetchCommunity = useCallback(async () => {
    if (!communityId) return;
    const { data } = await supabase
      .from('communities')
      .select('*')
      .eq('id', communityId)
      .single();
    if (data) {
      setCommunity(data);
      setFormName(data.name || '');
      setFormAddress(data.address || '');
      setFormPostcode(data.postcode || '');
      setFormDescription(data.description || '');
    }
    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    fetchCommunity();
  }, [fetchCommunity]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaveSuccess(false);

    const { error: updateError } = await supabase
      .from('communities')
      .update({
        name: formName.trim(),
        address: formAddress.trim() || null,
        postcode: formPostcode.trim() || null,
        description: formDescription.trim() || null,
      })
      .eq('id', communityId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    fetchCommunity();
    refresh();
  };

  const features = community?.settings?.features || {};
  const themePreset = community?.settings?.theme?.preset || 'midnight-modern';
  const themeInfo = THEME_LABELS[themePreset] || THEME_LABELS['midnight-modern'];

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          You don&apos;t have permission to view this page.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
        <div className="animate-spin" style={{
          width: 28, height: 28, border: '3px solid var(--border)',
          borderTopColor: 'var(--primary)', borderRadius: '50%',
        }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px, 4vw, 28px)',
          color: 'var(--text)', marginBottom: 6,
        }}>
          Community Settings
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
          Manage details for {community?.name}
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 340px)',
        gap: 24,
        alignItems: 'start',
      }}>
        {/* Left column — Editable info */}
        <div>
          {/* Community details form */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 24,
          }}>
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, color: 'var(--text)' }}>
                Community Details
              </h3>
              {saveSuccess && (
                <span style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--success)',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  ✓ Saved
                </span>
              )}
            </div>

            <form onSubmit={handleSave} style={{ padding: 24 }}>
              {error && (
                <div style={{
                  background: 'var(--error-bg)',
                  border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)',
                  borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                  fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--error)',
                  marginBottom: 16,
                }}>{error}</div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Name */}
                <div>
                  <label style={{
                    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                    color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                  }}>
                    Community Name <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Riverside Court"
                    required
                  />
                </div>

                {/* Address + Postcode row */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{
                      fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                      color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                    }}>Address</label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="e.g. 15 Riverside Walk"
                    />
                  </div>
                  <div>
                    <label style={{
                      fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                      color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                    }}>Postcode</label>
                    <input
                      type="text"
                      value={formPostcode}
                      onChange={(e) => setFormPostcode(e.target.value)}
                      placeholder="e.g. SE1 7TJ"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={{
                    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                    color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                  }}>
                    Description
                    <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}> (optional)</span>
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="A brief description of your community..."
                    rows={3}
                    style={{ resize: 'vertical', minHeight: 80 }}
                  />
                </div>

                {/* Logo placeholder */}
                <div>
                  <label style={{
                    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                    color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                  }}>Community Logo</label>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 18px', background: 'var(--surface-alt)',
                    borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)',
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 'var(--radius-md)',
                      background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: 700, color: 'white',
                      fontFamily: 'var(--font-heading)', flexShrink: 0,
                    }}>
                      {formName?.charAt(0)?.toUpperCase() || 'N'}
                    </div>
                    <div>
                      <p style={{
                        fontFamily: 'var(--font-body)', fontSize: 12,
                        color: 'var(--text-muted)', marginBottom: 2,
                      }}>
                        Logo upload coming soon
                      </p>
                      <p style={{
                        fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-faint)',
                      }}>
                        Using initial letter for now
                      </p>
                    </div>
                  </div>
                </div>

                {/* Save button */}
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                  style={{ marginTop: 4, width: 'auto', alignSelf: 'flex-start', padding: '10px 28px' }}
                >
                  {saving ? (
                    <span className="animate-spin" style={{
                      display: 'inline-block', width: 18, height: 18,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white', borderRadius: '50%',
                    }} />
                  ) : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right column — Read-only info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Theme */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid var(--border)',
            }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--text)' }}>
                Theme
              </h3>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', background: 'var(--surface-alt)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {themeInfo.colors.map((c, i) => (
                    <div key={i} style={{
                      width: 20, height: 20, borderRadius: 'var(--radius-sm)',
                      background: c, border: '1px solid var(--border)',
                    }} />
                  ))}
                </div>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
                    color: 'var(--text)',
                  }}>
                    {themeInfo.label}
                  </div>
                </div>
              </div>
              {!isSuperAdmin && (
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-faint)',
                  marginTop: 10, lineHeight: 1.5,
                }}>
                  Theme is managed by the platform team. Contact support to change it.
                </p>
              )}
            </div>
          </div>

          {/* Features */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--text)' }}>
                Features
              </h3>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px',
                borderRadius: 'var(--radius-full)', background: 'var(--surface-alt)',
                color: 'var(--text-faint)', border: '1px solid var(--border)',
              }}>
                {Object.values(features).filter(Boolean).length} active
              </span>
            </div>
            <div style={{ padding: '8px 12px' }}>
              {Object.entries(FEATURE_LABELS).map(([key, info]) => {
                const enabled = features[key] !== false;
                return (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 8px',
                    borderBottom: '1px solid var(--border)',
                    opacity: enabled ? 1 : 0.4,
                  }}>
                    <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{info.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                        color: 'var(--text)',
                      }}>
                        {info.label}
                      </div>
                    </div>
                    <div style={{
                      width: 32, height: 18, borderRadius: 9,
                      background: enabled ? 'var(--primary)' : 'var(--border)',
                      position: 'relative',
                      transition: 'background 0.2s ease',
                    }}>
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%',
                        background: 'white',
                        position: 'absolute', top: 2,
                        left: enabled ? 16 : 2,
                        transition: 'left 0.2s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
            {!isSuperAdmin && (
              <div style={{
                padding: '12px 20px', borderTop: '1px solid var(--border)',
                background: 'var(--surface-alt)',
              }}>
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-faint)',
                  lineHeight: 1.5,
                }}>
                  Features are managed by the platform team. Contact support to enable or disable features for your community.
                </p>
              </div>
            )}
          </div>

          {/* Community info */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid var(--border)',
            }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--text)' }}>
                Technical Info
              </h3>
            </div>
            <div style={{ padding: '12px 20px' }}>
              {[
                { label: 'Slug', value: community?.slug || '—' },
                { label: 'Community ID', value: community?.id || '—' },
                {
                  label: 'Created',
                  value: community?.created_at
                    ? new Date(community.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })
                    : '—',
                },
              ].map((item) => (
                <div key={item.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
                    color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>{item.label}</span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)',
                    maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }} title={item.value}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}