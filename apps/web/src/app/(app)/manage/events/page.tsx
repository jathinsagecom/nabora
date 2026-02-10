'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../lib/auth-context';
import { createClient } from '../../../../lib/supabase-browser';

interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
  max_attendees: number | null;
  is_published: boolean;
  created_at: string;
  creator: { id: string; full_name: string } | null;
  rsvps: { id: string; status: string; user_id: string; user: { full_name: string; email: string; phone: string | null } | null }[];
}

interface Member {
  user_id: string;
  user: { id: string; full_name: string; email: string; phone: string | null } | null;
}

interface ResidentRow {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: 'going' | 'maybe' | 'not_going' | 'no_response';
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function daysUntil(dateStr: string) {
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Past';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `${diff} days`;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; badge: string }> = {
  going: { label: 'Going', color: 'var(--primary)', badge: '✓ Going' },
  maybe: { label: 'Maybe', color: 'var(--warning)', badge: '? Maybe' },
  not_going: { label: 'Not Going', color: 'var(--error)', badge: '✗ Not Going' },
  no_response: { label: 'No Response', color: 'var(--text-faint)', badge: '— Pending' },
};

export default function ManageEventsPage() {
  const { activeMembership, isAdmin } = useAuth();
  const supabase = createClient();
  const communityId = activeMembership?.community_id;

  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  // Detail modal state
  const [detailTab, setDetailTab] = useState<'all' | 'going' | 'maybe' | 'not_going' | 'no_response'>('all');
  const [detailSearch, setDetailSearch] = useState('');
  const [nudging, setNudging] = useState(false);
  const [nudgeMessage, setNudgeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    if (!communityId) return;

    const { data: eventData } = await supabase
      .from('events')
      .select('*, creator:users!events_created_by_fkey(id, full_name), rsvps:event_rsvps(id, status, user_id, user:users!event_rsvps_user_id_fkey(full_name, email, phone))')
      .eq('community_id', communityId)
      .order('starts_at', { ascending: false });
    if (eventData) setEvents(eventData);

    const { data: memberData } = await supabase
      .from('user_communities')
      .select('user_id, user:users(id, full_name, email, phone)')
      .eq('community_id', communityId);
    if (memberData) setMembers(memberData.map((m: any) => ({ user_id: m.user_id, user: Array.isArray(m.user) ? m.user[0] || null : m.user })));

    setLoading(false);
  }, [communityId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build unified resident list for selected event
  const getResidentRows = (event: Event): ResidentRow[] => {
    const respondedMap = new Map<string, { status: string; user: any }>();
    event.rsvps.forEach((r) => {
      respondedMap.set(r.user_id, { status: r.status, user: r.user });
    });

    const rows: ResidentRow[] = [];

    // Add responded residents
    event.rsvps.forEach((r) => {
      rows.push({
        user_id: r.user_id,
        full_name: r.user?.full_name || 'Unknown',
        email: r.user?.email || '',
        phone: r.user?.phone || null,
        status: r.status as any,
      });
    });

    // Add non-responded members
    members.forEach((m) => {
      if (!respondedMap.has(m.user_id)) {
        rows.push({
          user_id: m.user_id,
          full_name: m.user?.full_name || 'Unknown',
          email: m.user?.email || '',
          phone: m.user?.phone || null,
          status: 'no_response',
        });
      }
    });

    return rows;
  };

  const getFilteredRows = (event: Event) => {
    let rows = getResidentRows(event);

    // Tab filter
    if (detailTab !== 'all') {
      rows = rows.filter((r) => r.status === detailTab);
    }

    // Search filter
    if (detailSearch) {
      const q = detailSearch.toLowerCase();
      rows = rows.filter((r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.phone?.includes(q)
      );
    }

    return rows;
  };

  const getStatusCounts = (event: Event) => {
    const all = getResidentRows(event);
    return {
      all: all.length,
      going: all.filter((r) => r.status === 'going').length,
      maybe: all.filter((r) => r.status === 'maybe').length,
      not_going: all.filter((r) => r.status === 'not_going').length,
      no_response: all.filter((r) => r.status === 'no_response').length,
    };
  };

  const getResponseRate = (event: Event) => {
    if (members.length === 0) return 0;
    return Math.round((event.rsvps.length / members.length) * 100);
  };

  const filteredEvents = events.filter((e) => {
    const isPast = new Date(e.starts_at) < new Date();
    if (filter === 'upcoming') return !isPast;
    if (filter === 'past') return isPast;
    return true;
  });

  const handleNudge = async (event: Event, userIds: string[]) => {
    setNudging(true);
    setNudgeMessage(null);

    try {
      const notifications = userIds.map((uid) => ({
        community_id: communityId,
        user_id: uid,
        type: 'event_reminder',
        title: `RSVP Reminder: ${event.title}`,
        message: `You haven't responded to "${event.title}" on ${formatDate(event.starts_at)}. Please let us know if you can attend.`,
        link: '/events',
      }));

      const { error } = await supabase.from('notifications').insert(notifications);

      if (error) {
        setNudgeMessage({ type: 'error', text: `Failed to send: ${error.message}` });
      } else {
        setNudgeMessage({ type: 'success', text: `Reminder sent to ${userIds.length} ${userIds.length === 1 ? 'person' : 'people'}` });
      }
    } catch (err: any) {
      setNudgeMessage({ type: 'error', text: `Failed to send: ${err.message || 'Unknown error'}` });
    }

    setNudging(false);
    setTimeout(() => setNudgeMessage(null), 4000);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Delete this event? All RSVPs will be lost.')) return;
    await supabase.from('events').delete().eq('id', eventId);
    setSelectedEvent(null);
    fetchData();
  };

  const exportCsv = (event: Event) => {
    const rows = getFilteredRows(event);
    const csvRows = [['Name', 'Email', 'Phone', 'Status']];
    rows.forEach((r) => {
      csvRows.push([
        r.full_name,
        r.email,
        r.phone || '',
        STATUS_CONFIG[r.status]?.label || r.status,
      ]);
    });

    const csv = csvRows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const tabLabel = detailTab === 'all' ? 'all' : STATUS_CONFIG[detailTab]?.label.toLowerCase().replace(/\s/g, '-');
    a.download = `${event.title.replace(/[^a-z0-9]/gi, '-')}-${tabLabel}-responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openDetail = (event: Event) => {
    setSelectedEvent(event);
    setDetailTab('all');
    setDetailSearch('');
    setNudgeMessage(null);
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>You don&apos;t have permission to view this page.</p>
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
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--text)', marginBottom: 6 }}>Manage Events</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
            Track responses and manage attendance · {activeMembership?.community?.name}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {(['upcoming', 'past', 'all'] as const).map((f) => {
          const count = f === 'upcoming' ? events.filter((e) => new Date(e.starts_at) >= new Date()).length
            : f === 'past' ? events.filter((e) => new Date(e.starts_at) < new Date()).length : events.length;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '7px 14px', borderRadius: 'var(--radius-full)',
              border: filter === f ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: filter === f ? 'var(--primary-glow)' : 'transparent',
              color: filter === f ? 'var(--primary)' : 'var(--text-muted)',
              fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedEvent && (() => {
        const counts = getStatusCounts(selectedEvent);
        const responseRate = getResponseRate(selectedEvent);
        const filteredRows = getFilteredRows(selectedEvent);
        const noResponseIds = getResidentRows(selectedEvent).filter((r) => r.status === 'no_response').map((r) => r.user_id);

        return (
          <>
            <div onClick={() => setSelectedEvent(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 620, maxHeight: '90vh', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow)', zIndex: 61, display: 'flex', flexDirection: 'column' }}>

              {/* Modal header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--text)', marginBottom: 2 }}>{selectedEvent.title}</h3>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-faint)' }}>
                    <span>📅 {formatDate(selectedEvent.starts_at)}</span>
                    <span>🕐 {formatTime(selectedEvent.starts_at)}</span>
                    {selectedEvent.location && <span>📍 {selectedEvent.location}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => handleDeleteEvent(selectedEvent.id)} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Delete event">🗑</button>
                  <button onClick={() => setSelectedEvent(null)} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              </div>

              {/* Response rate bar */}
              <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Response Rate</span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: responseRate >= 75 ? 'var(--primary)' : responseRate >= 50 ? 'var(--warning)' : 'var(--error)' }}>{responseRate}%</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'var(--surface-alt)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, background: responseRate >= 75 ? 'var(--primary)' : responseRate >= 50 ? 'var(--warning)' : 'var(--error)', width: `${responseRate}%`, transition: 'width 0.3s ease' }} />
                </div>
              </div>

              {/* Tab navigation */}
              <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0, overflowX: 'auto' }}>
                <div style={{ display: 'flex', gap: 4, minWidth: 'max-content' }}>
                  {([
                    { key: 'all', label: 'All', count: counts.all },
                    { key: 'going', label: 'Going', count: counts.going },
                    { key: 'maybe', label: 'Maybe', count: counts.maybe },
                    { key: 'not_going', label: 'Not Going', count: counts.not_going },
                    { key: 'no_response', label: 'No Response', count: counts.no_response },
                  ] as const).map((tab) => {
                    const conf = STATUS_CONFIG[tab.key] || { color: 'var(--text)' };
                    const isActive = detailTab === tab.key;
                    return (
                      <button key={tab.key} onClick={() => setDetailTab(tab.key)} style={{
                        padding: '6px 12px', borderRadius: 'var(--radius-full)',
                        border: isActive ? `1px solid ${tab.key === 'all' ? 'var(--primary)' : conf.color}` : '1px solid transparent',
                        background: isActive ? `color-mix(in srgb, ${tab.key === 'all' ? 'var(--primary)' : conf.color} 10%, transparent)` : 'transparent',
                        color: isActive ? (tab.key === 'all' ? 'var(--primary)' : conf.color) : 'var(--text-muted)',
                        fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}>
                        {tab.label} ({tab.count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search */}
              <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <input type="text" value={detailSearch} onChange={(e) => setDetailSearch(e.target.value)} placeholder="Search by name, email, or phone..." style={{ fontSize: 12, padding: '7px 12px', borderRadius: 'var(--radius-full)', width: '100%' }} />
              </div>

              {/* Nudge message */}
              {nudgeMessage && (
                <div style={{
                  padding: '10px 24px', flexShrink: 0,
                }}>
                  <div style={{
                    padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                    background: nudgeMessage.type === 'success' ? 'color-mix(in srgb, var(--primary) 10%, transparent)' : 'var(--error-bg)',
                    border: `1px solid ${nudgeMessage.type === 'success' ? 'color-mix(in srgb, var(--primary) 25%, transparent)' : 'color-mix(in srgb, var(--error) 25%, transparent)'}`,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ fontSize: 14 }}>{nudgeMessage.type === 'success' ? '✅' : '❌'}</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: nudgeMessage.type === 'success' ? 'var(--primary)' : 'var(--error)' }}>{nudgeMessage.text}</span>
                  </div>
                </div>
              )}

              {/* Scrollable resident list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 24px 12px' }}>
                {filteredRows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '28px 0' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>
                      {detailSearch ? 'No residents match your search.' : 'No residents in this group.'}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {filteredRows.map((row) => {
                      const conf = STATUS_CONFIG[row.status];
                      return (
                        <div key={row.user_id} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                          background: 'var(--surface-alt)', borderRadius: 'var(--radius-sm)',
                          border: row.status === 'no_response' ? '1px dashed var(--border)' : '1px solid var(--border)',
                        }}>
                          {/* Avatar */}
                          <div style={{ width: 30, height: 30, borderRadius: 'var(--radius-full)', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', flexShrink: 0 }}>
                            {row.full_name.charAt(0).toUpperCase()}
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: row.status === 'no_response' ? 'var(--text-muted)' : 'var(--text)' }}>{row.full_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row.email}{row.phone ? ` · ${row.phone}` : ''}
                            </div>
                          </div>

                          {/* Status badge */}
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: `color-mix(in srgb, ${conf.color} 12%, transparent)`,
                            color: conf.color, flexShrink: 0, whiteSpace: 'nowrap',
                          }}>
                            {conf.badge}
                          </span>

                          {/* Individual nudge for no response */}
                          {row.status === 'no_response' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleNudge(selectedEvent, [row.user_id]); }}
                              disabled={nudging}
                              style={{
                                padding: '3px 8px', borderRadius: 'var(--radius-full)',
                                border: '1px solid var(--primary)', background: 'transparent',
                                color: 'var(--primary)', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                                fontFamily: 'var(--font-body)', flexShrink: 0,
                              }}
                            >
                              🔔
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sticky action bar */}
              <div style={{
                padding: '12px 24px', borderTop: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0, flexWrap: 'wrap', gap: 8,
                background: 'var(--surface)',
              }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-faint)' }}>
                  {filteredRows.length} {filteredRows.length === 1 ? 'resident' : 'residents'}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {/* Nudge all - only on no_response tab */}
                  {detailTab === 'no_response' && counts.no_response > 0 && (
                    <button
                      onClick={() => handleNudge(selectedEvent, noResponseIds)}
                      disabled={nudging}
                      style={{
                        padding: '7px 14px', borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--primary)', background: 'var(--primary-glow)',
                        color: 'var(--primary)', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {nudging ? 'Sending...' : `🔔 Nudge All (${counts.no_response})`}
                    </button>
                  )}
                  <button
                    onClick={() => exportCsv(selectedEvent)}
                    style={{
                      padding: '7px 14px', borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--border)', background: 'transparent',
                      color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    📥 Export CSV
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Event List */}
      {filteredEvents.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No {filter === 'all' ? '' : filter} events.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredEvents.map((event) => {
            const counts = getStatusCounts(event);
            const responseRate = getResponseRate(event);
            const isPast = new Date(event.starts_at) < new Date();

            return (
              <div key={event.id} onClick={() => openDetail(event)} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '16px 18px',
                cursor: 'pointer', opacity: isPast ? 0.6 : 1,
                transition: 'border-color 0.15s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                  {/* Date block */}
                  <div style={{
                    width: 50, height: 54, borderRadius: 'var(--radius-sm)',
                    background: isPast ? 'var(--surface-alt)' : 'var(--primary-glow)',
                    border: `1px solid ${isPast ? 'var(--border)' : 'color-mix(in srgb, var(--primary) 25%, var(--border))'}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: isPast ? 'var(--text-muted)' : 'var(--text)', lineHeight: 1 }}>
                      {new Date(event.starts_at).getDate()}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: isPast ? 'var(--text-faint)' : 'var(--primary)', letterSpacing: 0.5 }}>
                      {new Date(event.starts_at).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
                    </span>
                  </div>

                  {/* Event info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{event.title}</span>
                      {!isPast && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--text-faint)' }}>
                          {daysUntil(event.starts_at)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-faint)', marginBottom: 8 }}>
                      <span>🕐 {formatTime(event.starts_at)}</span>
                      {event.location && <span>📍 {event.location}</span>}
                      {event.max_attendees && <span>👥 Max {event.max_attendees}</span>}
                    </div>

                    {/* Response summary */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[
                          { key: 'going', value: counts.going },
                          { key: 'maybe', value: counts.maybe },
                          { key: 'not_going', value: counts.not_going },
                          { key: 'no_response', value: counts.no_response },
                        ].map((s) => {
                          if (s.value === 0) return null;
                          const conf = STATUS_CONFIG[s.key];
                          return (
                            <span key={s.key} style={{
                              fontSize: 10, fontWeight: 700, padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              background: `color-mix(in srgb, ${conf.color} 12%, transparent)`,
                              color: conf.color,
                            }}>
                              {s.value} {conf.label}
                            </span>
                          );
                        })}
                      </div>

                      {/* Mini progress bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                        <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--surface-alt)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 2, background: responseRate >= 75 ? 'var(--primary)' : responseRate >= 50 ? 'var(--warning)' : 'var(--error)', width: `${responseRate}%` }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-faint)' }}>{responseRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}