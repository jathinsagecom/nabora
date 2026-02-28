'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../lib/auth-context';
import { createClient } from '../../../../lib/supabase-browser';

interface Invite {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  unit_number: string | null;
  unit_id: string | null;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  unit?: { unit_number: string; attributes: Record<string, any> } | null;
}

interface Unit {
  id: string;
  unit_number: string;
  attributes: Record<string, any>;
  unit_type: {
    id: string;
    name: string;
    category: string;
    icon: string | null;
  } | null;
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: 'var(--warning)', color: '#000', label: 'Pending' },
  accepted: { bg: 'var(--success)', color: '#fff', label: 'Accepted' },
  expired: { bg: 'var(--text-faint)', color: '#fff', label: 'Expired' },
  revoked: { bg: 'var(--error)', color: '#fff', label: 'Revoked' },
};

export default function ManageInvitesPage() {
  const { activeMembership, isAdmin, user } = useAuth();
  const supabase = createClient();
  const communityId = activeMembership?.community_id;

  const [invites, setInvites] = useState<Invite[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Form state
  const [formEmail, setFormEmail] = useState('');
  const [formUnitId, setFormUnitId] = useState('');
  const [formRole, setFormRole] = useState<'resident' | 'community_admin'>('resident');
  const [formResidentType, setFormResidentType] = useState<string>('tenant');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState<{ token: string; email: string } | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchInvites = useCallback(async () => {
    if (!communityId) return;
    const { data } = await supabase
      .from('invites')
      .select('*, unit:units(unit_number, attributes)')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false });
    if (data) setInvites(data);
    setLoading(false);
  }, [communityId]);

  const fetchUnits = useCallback(async () => {
    if (!communityId) return;
    const { data } = await supabase
      .from('units')
      .select('id, unit_number, attributes, unit_type:community_unit_types(id, name, category, icon)')
      .eq('community_id', communityId)
      .eq('is_active', true)
      .order('unit_number');
    if (data) {
      const parsed = data.map((u: any) => ({
        ...u,
        unit_type: Array.isArray(u.unit_type) ? u.unit_type[0] || null : u.unit_type,
      }));
      setUnits(parsed.filter((u: any) => u.unit_type?.category === 'residential'));
    }
  }, [communityId]);

  useEffect(() => {
    fetchInvites();
    fetchUnits();
  }, [fetchInvites, fetchUnits]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');
    setFormSuccess(null);

    // Check for existing pending invite with same email
    const existing = invites.find(
      (i) => i.email === formEmail && i.status === 'pending'
    );
    if (existing) {
      setFormError('A pending invite already exists for this email address.');
      setFormSubmitting(false);
      return;
    }

    const { data, error } = await supabase
      .from('invites')
      .insert({
        community_id: communityId,
        email: formEmail,
        unit_id: formUnitId || null,
        role: formRole,
        resident_type: formUnitId ? formResidentType : null,
        invited_by: user?.id || '',
      })
      .select('token, email')
      .single();

    if (error) {
      console.error('Invite creation error:', error);
      setFormError(error.message || 'Failed to create invite.');
      setFormSubmitting(false);
      return;
    }

    setFormSuccess({ token: data.token, email: data.email });
    setFormSubmitting(false);
    fetchInvites();
  };

  const handleRevoke = async (inviteId: string) => {
    await supabase
      .from('invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId);
    fetchInvites();
  };

  const getInviteLink = (token: string) => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return `${base}/auth/register?token=${token}`;
  };

  const copyToClipboard = async (token: string) => {
    const link = getInviteLink(token);
    await navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const resetForm = () => {
    setFormEmail('');
    setFormUnitId('');
    setFormRole('resident');
    setFormResidentType('tenant');
    setFormError('');
    setFormSuccess(null);
    setShowForm(false);
  };

  const filteredInvites =
    statusFilter === 'all'
      ? invites
      : invites.filter((i) => i.status === statusFilter);

  const counts = {
    all: invites.length,
    pending: invites.filter((i) => i.status === 'pending').length,
    accepted: invites.filter((i) => i.status === 'accepted').length,
    expired: invites.filter((i) => i.status === 'expired').length,
    revoked: invites.filter((i) => i.status === 'revoked').length,
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          You don't have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(22px, 4vw, 28px)',
            color: 'var(--text)',
            marginBottom: 6,
          }}>
            Manage Invites
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--text-muted)',
          }}>
            Invite residents to {activeMembership?.community?.name}
          </p>
        </div>

        <button
          onClick={() => { setShowForm(true); setFormSuccess(null); setFormError(''); }}
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 22px', fontSize: 13 }}
        >
          + Invite Resident
        </button>
      </div>

      {/* Create Invite Modal */}
      {showForm && (
        <>
          <div
            onClick={resetForm}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 60,
              backdropFilter: 'blur(4px)',
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            maxWidth: 460,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--card-shadow)',
            zIndex: 61,
            overflow: 'hidden',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 24px',
              borderBottom: '1px solid var(--border)',
            }}>
              <h3 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 17,
                color: 'var(--text)',
              }}>
                {formSuccess ? 'Invite Created!' : 'Invite a Resident'}
              </h3>
              <button
                onClick={resetForm}
                style={{
                  width: 30, height: 30, borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px 24px 24px' }}>
              {formSuccess ? (
                /* Success state — show link to copy */
                <div>
                  <div style={{
                    background: 'var(--primary-glow)',
                    border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)',
                    borderRadius: 'var(--radius-md)',
                    padding: 16,
                    marginBottom: 16,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>✉️</div>
                    <p style={{
                      fontFamily: 'var(--font-body)', fontSize: 14,
                      color: 'var(--text)', lineHeight: 1.6,
                    }}>
                      Invite created for <strong>{formSuccess.email}</strong>
                    </p>
                  </div>

                  <label style={{
                    fontFamily: 'var(--font-body)', fontSize: 12,
                    fontWeight: 600, color: 'var(--text-secondary)',
                    display: 'block', marginBottom: 7,
                  }}>
                    Invite Link
                  </label>
                  <div style={{
                    display: 'flex', gap: 8, marginBottom: 16,
                  }}>
                    <input
                      type="text"
                      value={getInviteLink(formSuccess.token)}
                      readOnly
                      style={{
                        flex: 1,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        background: 'var(--surface-alt)',
                        cursor: 'text',
                      }}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button
                      onClick={() => copyToClipboard(formSuccess.token)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--primary)',
                        background: copiedToken === formSuccess.token
                          ? 'var(--primary)' : 'transparent',
                        color: copiedToken === formSuccess.token
                          ? 'white' : 'var(--primary)',
                        fontFamily: 'var(--font-body)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {copiedToken === formSuccess.token ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>

                  <p style={{
                    fontSize: 12, color: 'var(--text-faint)',
                    lineHeight: 1.6, marginBottom: 18,
                  }}>
                    Share this link with the resident via email, WhatsApp, or any other method. The link expires in 30 days.
                  </p>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => {
                        setFormSuccess(null);
                        setFormEmail('');
                        setFormUnitId('');
                        setFormRole('resident');
                        setFormResidentType('tenant');
                        setFormError('');
                      }}
                      className="btn-secondary"
                      style={{ fontSize: 13 }}
                    >
                      Invite another
                    </button>
                    <button
                      onClick={resetForm}
                      className="btn-primary"
                      style={{ fontSize: 13 }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* Invite form */
                <form onSubmit={handleCreateInvite} style={{
                  display: 'flex', flexDirection: 'column', gap: 16,
                }}>
                  {formError && (
                    <div style={{
                      background: 'var(--error-bg)',
                      border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      color: 'var(--error)',
                    }}>
                      {formError}
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <label style={{
                      fontFamily: 'var(--font-body)', fontSize: 12,
                      fontWeight: 600, color: 'var(--text-secondary)',
                      display: 'block', marginBottom: 7,
                    }}>
                      Email address <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="resident@email.com"
                      required
                      autoFocus
                    />
                  </div>

                  {/* Unit dropdown */}
                  <div>
                    <label style={{
                      fontFamily: 'var(--font-body)', fontSize: 12,
                      fontWeight: 600, color: 'var(--text-secondary)',
                      display: 'block', marginBottom: 7,
                    }}>
                      Unit / Flat
                      <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}> (optional)</span>
                    </label>
                    <select
                      value={formUnitId}
                      onChange={(e) => setFormUnitId(e.target.value)}
                      style={{
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748B' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 14px center',
                        paddingRight: 36,
                      }}
                    >
                      <option value="">No unit assigned</option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.unit_type?.icon || ''} {unit.unit_number}
                          {unit.unit_type ? ` · ${unit.unit_type.name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Role */}
                  <div>
                    <label style={{
                      fontFamily: 'var(--font-body)', fontSize: 12,
                      fontWeight: 600, color: 'var(--text-secondary)',
                      display: 'block', marginBottom: 7,
                    }}>
                      Role
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { value: 'resident', label: 'Resident', desc: 'View content, RSVP, book services' },
                        { value: 'community_admin', label: 'Admin', desc: 'Full management access' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormRole(opt.value as 'resident' | 'community_admin')}
                          style={{
                            flex: 1,
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: formRole === opt.value
                              ? '2px solid var(--primary)'
                              : '1px solid var(--border)',
                            background: formRole === opt.value
                              ? 'var(--primary-glow)' : 'var(--surface-alt)',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <div style={{
                            fontFamily: 'var(--font-body)', fontSize: 13,
                            fontWeight: 700,
                            color: formRole === opt.value
                              ? 'var(--primary)' : 'var(--text)',
                          }}>
                            {opt.label}
                          </div>
                          <div style={{
                            fontFamily: 'var(--font-body)', fontSize: 11,
                            color: 'var(--text-faint)', marginTop: 2,
                          }}>
                            {opt.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Resident Type — only show when a unit is selected */}
                  {formUnitId && (
                    <div>
                      <label style={{
                        fontFamily: 'var(--font-body)', fontSize: 12,
                        fontWeight: 600, color: 'var(--text-secondary)',
                        display: 'block', marginBottom: 7,
                      }}>
                        Resident Type
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                          { value: 'owner', label: 'Owner', desc: 'Owns the flat, lives there' },
                          { value: 'tenant', label: 'Tenant', desc: 'Renting the flat' },
                          { value: 'household_member', label: 'Household', desc: 'Family member / flatmate' },
                          { value: 'living_out_landlord', label: 'Landlord', desc: 'Owns but lives elsewhere' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFormResidentType(opt.value)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 'var(--radius-md)',
                              border: formResidentType === opt.value
                                ? '2px solid var(--accent)'
                                : '1px solid var(--border)',
                              background: formResidentType === opt.value
                                ? 'color-mix(in srgb, var(--accent) 10%, transparent)'
                                : 'var(--surface-alt)',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <div style={{
                              fontFamily: 'var(--font-body)', fontSize: 12,
                              fontWeight: 700,
                              color: formResidentType === opt.value
                                ? 'var(--accent)' : 'var(--text)',
                            }}>
                              {opt.label}
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-body)', fontSize: 10,
                              color: 'var(--text-faint)', marginTop: 1,
                            }}>
                              {opt.desc}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={formSubmitting}
                    style={{ marginTop: 4 }}
                  >
                    {formSubmitting ? (
                      <span className="animate-spin" style={{
                        display: 'inline-block', width: 18, height: 18,
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white', borderRadius: '50%',
                      }} />
                    ) : (
                      'Create Invite'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </>
      )}

      {/* Status filter tabs */}
      <div style={{
        display: 'flex',
        gap: 6,
        marginBottom: 20,
        overflowX: 'auto',
        paddingBottom: 4,
      }}>
        {['all', 'pending', 'accepted', 'expired', 'revoked'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            style={{
              padding: '7px 14px',
              borderRadius: 'var(--radius-full)',
              border: statusFilter === status
                ? '1px solid var(--primary)'
                : '1px solid var(--border)',
              background: statusFilter === status
                ? 'var(--primary-glow)' : 'transparent',
              color: statusFilter === status
                ? 'var(--primary)' : 'var(--text-muted)',
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <span style={{
              marginLeft: 6,
              fontSize: 11,
              opacity: 0.7,
            }}>
              {counts[status as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* Invites list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div className="animate-spin" style={{
            width: 28, height: 28, border: '3px solid var(--border)',
            borderTopColor: 'var(--primary)', borderRadius: '50%',
          }} />
        </div>
      ) : filteredInvites.length === 0 ? (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>
            {statusFilter === 'all' ? '✉️' : '🔍'}
          </div>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 14,
            color: 'var(--text-muted)', marginBottom: 16,
          }}>
            {statusFilter === 'all'
              ? 'No invites yet. Create one to get started!'
              : `No ${statusFilter} invites.`}
          </p>
          {statusFilter === 'all' && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 22px', fontSize: 13 }}
            >
              + Invite Resident
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredInvites.map((invite) => {
            const statusStyle = STATUS_STYLES[invite.status] || STATUS_STYLES.pending;
            const isExpired = new Date(invite.expires_at) < new Date();
            const isPending = invite.status === 'pending' && !isExpired;

            return (
              <div
                key={invite.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                {/* Email + unit info */}
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{
                    fontFamily: 'var(--font-body)', fontSize: 14,
                    fontWeight: 600, color: 'var(--text)',
                    marginBottom: 3,
                  }}>
                    {invite.email}
                  </div>
                  <div style={{
                    display: 'flex', gap: 8, alignItems: 'center',
                    flexWrap: 'wrap',
                  }}>
                    {invite.unit?.unit_number && (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11,
                        color: 'var(--text-faint)',
                        background: 'var(--surface-alt)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                      }}>
                        {invite.unit.unit_number}
                      </span>
                    )}
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 11,
                      color: invite.role === 'community_admin'
                        ? 'var(--accent)' : 'var(--text-faint)',
                    }}>
                      {invite.role === 'community_admin' ? 'Admin' : 'Resident'}
                    </span>
                    <span style={{
                      fontSize: 11, color: 'var(--text-faint)',
                    }}>
                      · {new Date(invite.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Status badge */}
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  background: statusStyle.bg,
                  color: statusStyle.color,
                  letterSpacing: 0.3,
                }}>
                  {statusStyle.label}
                </span>

                {/* Actions */}
                {isPending && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => copyToClipboard(invite.token)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        background: copiedToken === invite.token
                          ? 'var(--primary)' : 'var(--surface-alt)',
                        color: copiedToken === invite.token
                          ? 'white' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-body)',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {copiedToken === invite.token ? '✓ Copied' : 'Copy link'}
                    </button>
                    <button
                      onClick={() => handleRevoke(invite.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)',
                        background: 'transparent',
                        color: 'var(--error)',
                        fontFamily: 'var(--font-body)',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Revoke
                    </button>
                  </div>
                )}

                {invite.status === 'accepted' && invite.accepted_at && (
                  <span style={{
                    fontSize: 11, color: 'var(--text-faint)',
                  }}>
                    Accepted {new Date(invite.accepted_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short',
                    })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}