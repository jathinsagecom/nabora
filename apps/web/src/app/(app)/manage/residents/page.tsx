'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../lib/auth-context';
import { createClient } from '../../../../lib/supabase-browser';

interface ResidentMembership {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    is_active: boolean;
    is_super_admin: boolean;
  } | null;
}

interface ResidentResidency {
  id: string;
  user_id: string;
  resident_type: string;
  starts_at: string;
  ends_at: string | null;
  is_current: boolean;
  notes: string | null;
  unit: {
    id: string;
    unit_number: string;
    floor: string | null;
    unit_type: string | null;
  } | null;
}

interface AvailableUnit {
  id: string;
  unit_number: string;
  floor: string | null;
  unit_type: string | null;
}

const RESIDENT_TYPES = [
  { value: 'owner', label: 'Owner', desc: 'Owns the unit' },
  { value: 'tenant', label: 'Tenant', desc: 'Renting the unit' },
  { value: 'household_member', label: 'Household', desc: 'Family / flatmate' },
  { value: 'living_out_landlord', label: 'Landlord', desc: 'Owns, lives elsewhere' },
];

const TYPE_ICON: Record<string, string> = {
  parking: '🅿️',
  storage: '📦',
  commercial: '🏪',
  penthouse: '🏙️',
};

export default function ManageResidentsPage() {
  const { activeMembership, isAdmin, isSuperAdmin, profile } = useAuth();
  const supabase = createClient();
  const communityId = activeMembership?.community_id;

  const [members, setMembers] = useState<ResidentMembership[]>([]);
  const [residencies, setResidencies] = useState<ResidentResidency[]>([]);
  const [units, setUnits] = useState<AvailableUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'resident' | 'community_admin'>('all');

  // Assign unit modal
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [assignUnitId, setAssignUnitId] = useState('');
  const [assignResidentType, setAssignResidentType] = useState('tenant');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Role change
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!communityId) return;

    // Fetch community members
    const { data: memberData } = await supabase
      .from('user_communities')
      .select('*, user:users(id, full_name, email, phone, avatar_url, is_active, is_super_admin)')
      .eq('community_id', communityId)
      .order('joined_at', { ascending: true });

    if (memberData) setMembers(memberData);

    // Fetch all residencies for this community's units
    const { data: residencyData } = await supabase
      .from('residencies')
      .select('*, unit:units(id, unit_number, floor, unit_type)')
      .eq('unit.community_id', communityId);

    if (residencyData) setResidencies(residencyData);

    // Fetch units for assignment dropdown
    const { data: unitData } = await supabase
      .from('units')
      .select('id, unit_number, floor, unit_type')
      .eq('community_id', communityId)
      .eq('is_active', true)
      .order('unit_number');

    if (unitData) setUnits(unitData);

    setLoading(false);
  }, [communityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getUserResidencies = (userId: string) =>
    residencies.filter((r) => r.user_id === userId);

  const getCurrentResidencies = (userId: string) =>
    getUserResidencies(userId).filter((r) => r.is_current);

  const getPastResidencies = (userId: string) =>
    getUserResidencies(userId).filter((r) => !r.is_current);

  const handleChangeRole = async (membership: ResidentMembership, newRole: string) => {
    await supabase
      .from('user_communities')
      .update({ role: newRole })
      .eq('id', membership.id);
    setChangingRoleId(null);
    fetchData();
  };

  const handleEndResidency = async (residencyId: string) => {
    await supabase
      .from('residencies')
      .update({ ends_at: new Date().toISOString().split('T')[0] })
      .eq('id', residencyId);
    fetchData();
  };

  const handleAssignUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningUserId || !assignUnitId) return;
    setAssignSubmitting(true);
    setAssignError('');

    const { error } = await supabase.from('residencies').insert({
      unit_id: assignUnitId,
      user_id: assigningUserId,
      resident_type: assignResidentType,
      starts_at: new Date().toISOString().split('T')[0],
    });

    if (error) {
      setAssignError(error.message);
      setAssignSubmitting(false);
      return;
    }

    setAssignSubmitting(false);
    setAssigningUserId(null);
    setAssignUnitId('');
    setAssignResidentType('tenant');
    fetchData();
  };

  const handleRemoveFromCommunity = async (membership: ResidentMembership) => {
    if (!confirm(`Remove ${membership.user?.full_name || membership.user?.email} from this community? Their residencies will remain in history.`)) return;

    // End all current residencies
    const userResidencies = getCurrentResidencies(membership.user_id);
    for (const r of userResidencies) {
      await supabase
        .from('residencies')
        .update({ ends_at: new Date().toISOString().split('T')[0] })
        .eq('id', r.id);
    }

    // Remove community membership
    await supabase
      .from('user_communities')
      .delete()
      .eq('id', membership.id);

    fetchData();
  };

  // Filtered members
  const filteredMembers = members.filter((m) => {
    if (roleFilter !== 'all' && m.role !== roleFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = m.user?.full_name?.toLowerCase() || '';
      const email = m.user?.email?.toLowerCase() || '';
      const userUnits = getCurrentResidencies(m.user_id);
      const unitMatch = userUnits.some(
        (r) => r.unit?.unit_number?.toLowerCase().includes(q)
      );
      if (!name.includes(q) && !email.includes(q) && !unitMatch) return false;
    }
    return true;
  });

  const stats = {
    total: members.length,
    admins: members.filter((m) => m.role === 'community_admin').length,
    residents: members.filter((m) => m.role === 'resident').length,
    unassigned: members.filter((m) => getCurrentResidencies(m.user_id).length === 0).length,
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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px, 4vw, 28px)',
          color: 'var(--text)', marginBottom: 6,
        }}>
          Manage Residents
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
          {activeMembership?.community?.name} · {stats.total} members
        </p>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: 12, marginBottom: 24,
      }}>
        {[
          { label: 'Total', value: stats.total, color: 'var(--text)' },
          { label: 'Admins', value: stats.admins, color: 'var(--accent)' },
          { label: 'Residents', value: stats.residents, color: 'var(--primary)' },
          { label: 'No Unit', value: stats.unassigned, color: 'var(--warning)' },
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
          placeholder="Search by name, email, or unit..."
          style={{ width: 240, padding: '8px 12px', fontSize: 12, borderRadius: 'var(--radius-full)' }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {(['all', 'resident', 'community_admin'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setRoleFilter(f)}
              style={{
                padding: '7px 14px', borderRadius: 'var(--radius-full)',
                border: roleFilter === f ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: roleFilter === f ? 'var(--primary-glow)' : 'transparent',
                color: roleFilter === f ? 'var(--primary)' : 'var(--text-muted)',
                fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {f === 'all' ? 'All' : f === 'community_admin' ? 'Admins' : 'Residents'}
            </button>
          ))}
        </div>
      </div>

      {/* Assign Unit Modal */}
      {assigningUserId && (
        <>
          <div onClick={() => { setAssigningUserId(null); setAssignError(''); }} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 60, backdropFilter: 'blur(4px)',
          }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '100%', maxWidth: 420, background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--card-shadow)', zIndex: 61, overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '18px 24px', borderBottom: '1px solid var(--border)',
            }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--text)' }}>
                Assign Unit
              </h3>
              <button onClick={() => { setAssigningUserId(null); setAssignError(''); }} style={{
                width: 30, height: 30, borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>
            <div style={{ padding: '20px 24px 24px' }}>
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)',
                marginBottom: 18,
              }}>
                Assigning to <strong style={{ color: 'var(--text)' }}>
                  {members.find((m) => m.user_id === assigningUserId)?.user?.full_name || 'user'}
                </strong>
              </p>
              <form onSubmit={handleAssignUnit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {assignError && (
                  <div style={{
                    background: 'var(--error-bg)',
                    border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)',
                    borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                    fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--error)',
                  }}>{assignError}</div>
                )}

                {/* Unit dropdown */}
                <div>
                  <label style={{
                    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                    color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                  }}>
                    Unit <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <select
                    value={assignUnitId}
                    onChange={(e) => setAssignUnitId(e.target.value)}
                    required
                    style={{
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748B' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 14px center',
                      paddingRight: 36,
                    }}
                  >
                    <option value="">Select a unit...</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {TYPE_ICON[u.unit_type || ''] || ''} {u.unit_number}
                        {u.floor ? ` (${u.floor})` : ''}
                        {u.unit_type ? ` · ${u.unit_type.replace(/_/g, ' ')}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Resident type */}
                <div>
                  <label style={{
                    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                    color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                  }}>
                    Resident Type
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {RESIDENT_TYPES.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAssignResidentType(opt.value)}
                        style={{
                          padding: '10px 12px', borderRadius: 'var(--radius-md)',
                          border: assignResidentType === opt.value
                            ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: assignResidentType === opt.value
                            ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--surface-alt)',
                          cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <div style={{
                          fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700,
                          color: assignResidentType === opt.value ? 'var(--accent)' : 'var(--text)',
                        }}>{opt.label}</div>
                        <div style={{
                          fontFamily: 'var(--font-body)', fontSize: 10,
                          color: 'var(--text-faint)', marginTop: 1,
                        }}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="button" onClick={() => { setAssigningUserId(null); setAssignError(''); }}
                    className="btn-secondary" style={{ fontSize: 13 }}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={assignSubmitting} style={{ fontSize: 13 }}>
                    {assignSubmitting ? (
                      <span className="animate-spin" style={{
                        display: 'inline-block', width: 18, height: 18,
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white', borderRadius: '50%',
                      }} />
                    ) : 'Assign Unit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Members list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div className="animate-spin" style={{
            width: 28, height: 28, border: '3px solid var(--border)',
            borderTopColor: 'var(--primary)', borderRadius: '50%',
          }} />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)' }}>
            {members.length === 0 ? 'No residents yet. Send an invite to get started!' : 'No residents match your filters.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredMembers.map((member) => {
            const user = member.user;
            if (!user) return null;
            const currentUnits = getCurrentResidencies(user.id);
            const pastUnits = getPastResidencies(user.id);
            const expanded = expandedUser === user.id;
            const isSelf = user.id === profile?.id;

            // Group units by type
            const homeUnits = currentUnits.filter(
              (r) => !['parking', 'storage'].includes(r.unit?.unit_type || '')
            );
            const parkingUnits = currentUnits.filter(
              (r) => r.unit?.unit_type === 'parking'
            );
            const storageUnits = currentUnits.filter(
              (r) => r.unit?.unit_type === 'storage'
            );

            return (
              <div key={member.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', overflow: 'hidden',
                opacity: user.is_active ? 1 : 0.6,
              }}>
                {/* Main row */}
                <div
                  onClick={() => setExpandedUser(expanded ? null : user.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 18px', cursor: 'pointer', flexWrap: 'wrap',
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 'var(--radius-full)',
                    background: 'linear-gradient(135deg, var(--primary-muted), var(--accent-muted))',
                    border: '2px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: 'var(--primary)',
                    fontFamily: 'var(--font-heading)', flexShrink: 0,
                  }}>
                    {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>

                  {/* Name + email */}
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
                      color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {user.full_name || 'Unnamed'}
                      {isSelf && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: '1px 6px',
                          borderRadius: 'var(--radius-full)', background: 'var(--primary-glow)',
                          color: 'var(--primary)',
                        }}>You</span>
                      )}
                      {user.is_super_admin && (
                        <span style={{ fontSize: 12 }} title="Super Admin">⚡</span>
                      )}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-body)', fontSize: 11,
                      color: 'var(--text-faint)', marginTop: 1,
                    }}>
                      {user.email}
                    </div>
                  </div>

                  {/* Units summary */}
                  <div style={{
                    display: 'flex', gap: 6, flexWrap: 'wrap', flex: '0 1 auto',
                  }}>
                    {currentUnits.length === 0 ? (
                      <span style={{
                        fontSize: 11, color: 'var(--warning)', fontStyle: 'italic',
                        fontFamily: 'var(--font-body)',
                      }}>No unit</span>
                    ) : (
                      currentUnits.map((r) => (
                        <span key={r.id} style={{
                          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
                          padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                          background: 'var(--surface-alt)', border: '1px solid var(--border)',
                          color: 'var(--text-secondary)',
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                          {TYPE_ICON[r.unit?.unit_type || ''] || ''}
                          {r.unit?.unit_number}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Role badge */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: member.role === 'community_admin'
                      ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--primary-glow)',
                    color: member.role === 'community_admin' ? 'var(--accent)' : 'var(--primary)',
                    flexShrink: 0,
                  }}>
                    {member.role === 'community_admin' ? 'Admin' : 'Resident'}
                  </span>

                  {/* Expand */}
                  <span style={{
                    fontSize: 10, color: 'var(--text-faint)',
                    transform: expanded ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease', flexShrink: 0,
                  }}>▼</span>
                </div>

                {/* Expanded */}
                {expanded && (
                  <div style={{
                    borderTop: '1px solid var(--border)', padding: '16px 18px',
                    background: 'var(--surface-alt)',
                  }}>
                    {/* Actions row */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setAssigningUserId(user.id); }}
                        style={{
                          padding: '7px 14px', borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--primary)',
                          background: 'transparent', color: 'var(--primary)',
                          fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        + Assign Unit
                      </button>

                      {!isSelf && (!user.is_super_admin || isSuperAdmin) && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setChangingRoleId(changingRoleId === member.id ? null : member.id);
                            }}
                            style={{
                              padding: '7px 14px', borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border)',
                              background: changingRoleId === member.id ? 'var(--surface)' : 'transparent',
                              color: 'var(--text-secondary)',
                              fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Change Role
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveFromCommunity(member); }}
                            style={{
                              padding: '7px 14px', borderRadius: 'var(--radius-sm)',
                              border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)',
                              background: 'transparent', color: 'var(--error)',
                              fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>

                    {/* Role changer */}
                    {changingRoleId === member.id && (
                      <div style={{
                        background: 'var(--surface)', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)', padding: 14, marginBottom: 16,
                      }}>
                        <div style={{
                          fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
                          color: 'var(--text-faint)', marginBottom: 10,
                        }}>
                          Select new role:
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {[
                            { value: 'resident', label: 'Resident' },
                            { value: 'community_admin', label: 'Admin' },
                          ].map((r) => (
                            <button
                              key={r.value}
                              onClick={() => handleChangeRole(member, r.value)}
                              disabled={member.role === r.value}
                              style={{
                                flex: 1, padding: '10px 14px',
                                borderRadius: 'var(--radius-md)',
                                border: member.role === r.value
                                  ? '2px solid var(--primary)' : '1px solid var(--border)',
                                background: member.role === r.value
                                  ? 'var(--primary-glow)' : 'var(--surface-alt)',
                                color: member.role === r.value
                                  ? 'var(--primary)' : 'var(--text)',
                                fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                                cursor: member.role === r.value ? 'default' : 'pointer',
                                opacity: member.role === r.value ? 0.7 : 1,
                              }}
                            >
                              {r.label} {member.role === r.value ? '(current)' : ''}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Info grid */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: 10, marginBottom: 16,
                    }}>
                      {[
                        { label: 'Email', value: user.email },
                        { label: 'Phone', value: user.phone || '—' },
                        { label: 'Joined', value: new Date(member.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
                        { label: 'Account', value: user.is_active ? 'Active' : 'Inactive' },
                      ].map((d) => (
                        <div key={d.label}>
                          <div style={{
                            fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
                            color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8,
                            marginBottom: 3,
                          }}>{d.label}</div>
                          <div style={{
                            fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)',
                            wordBreak: 'break-all',
                          }}>{d.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Current units grouped by type */}
                    {[
                      { label: 'Home', items: homeUnits, icon: '🏠' },
                      { label: 'Parking', items: parkingUnits, icon: '🅿️' },
                      { label: 'Storage', items: storageUnits, icon: '📦' },
                    ].map((group) => {
                      if (group.items.length === 0) return null;
                      return (
                        <div key={group.label} style={{ marginBottom: 12 }}>
                          <div style={{
                            fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
                            color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8,
                            marginBottom: 8,
                          }}>
                            {group.icon} {group.label} ({group.items.length})
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {group.items.map((r) => (
                              <div key={r.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '10px 14px', background: 'var(--surface)',
                                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                                flexWrap: 'wrap', gap: 8,
                              }}>
                                <div>
                                  <div style={{
                                    fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700,
                                    color: 'var(--text)',
                                  }}>
                                    {r.unit?.unit_number}
                                  </div>
                                  {r.unit?.floor && (
                                    <div style={{
                                      fontSize: 11, color: 'var(--text-faint)', marginTop: 1,
                                    }}>{r.unit.floor} floor</div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{
                                    fontSize: 10, fontWeight: 600, padding: '3px 8px',
                                    borderRadius: 'var(--radius-full)',
                                    background: r.resident_type === 'owner'
                                      ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
                                      : 'var(--primary-glow)',
                                    color: r.resident_type === 'owner' ? 'var(--accent)' : 'var(--primary)',
                                  }}>
                                    {r.resident_type.replace(/_/g, ' ')}
                                  </span>
                                  <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                                    Since {new Date(r.starts_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                  </span>
                                  {!isSelf && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm(`End residency for ${r.unit?.unit_number}?`)) {
                                          handleEndResidency(r.id);
                                        }
                                      }}
                                      style={{
                                        padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                                        border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)',
                                        background: 'transparent', color: 'var(--error)',
                                        fontSize: 10, fontWeight: 600, cursor: 'pointer',
                                      }}
                                    >
                                      End
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {currentUnits.length === 0 && (
                      <div style={{
                        fontFamily: 'var(--font-body)', fontSize: 12,
                        color: 'var(--text-faint)', fontStyle: 'italic', marginBottom: 12,
                      }}>
                        No units assigned. Use &quot;Assign Unit&quot; to link a flat, parking space, or storage unit.
                      </div>
                    )}

                    {/* Past units */}
                    {pastUnits.length > 0 && (
                      <div>
                        <div style={{
                          fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
                          color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8,
                          marginBottom: 8,
                        }}>
                          History ({pastUnits.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {pastUnits.map((r) => (
                            <div key={r.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '6px 12px', background: 'var(--surface)',
                              borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                              opacity: 0.5,
                            }}>
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-muted)' }}>
                                {r.unit?.unit_number} · {r.resident_type.replace(/_/g, ' ')}
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                                {new Date(r.starts_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                {' → '}
                                {r.ends_at ? new Date(r.ends_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '?'}
                              </span>
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