'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../lib/auth-context';
import { createClient } from '../../../../lib/supabase-browser';

interface Booking {
  id: string;
  community_id: string;
  facility_id: string;
  user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  payment_status: string;
  admin_notes: string | null;
  created_at: string;
  facility: { name: string; location: string | null; booking_config: any; type_id: string } | null;
  user: { full_name: string; email: string; phone: string | null } | null;
}

interface Facility {
  id: string;
  name: string;
  booking_config: any;
  type_id: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Pending', color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 12%, transparent)', icon: '🟡' },
  approved: { label: 'Approved', color: 'var(--primary)', bg: 'color-mix(in srgb, var(--primary) 12%, transparent)', icon: '🟢' },
  rejected: { label: 'Rejected', color: 'var(--error)', bg: 'color-mix(in srgb, var(--error) 12%, transparent)', icon: '🔴' },
  cancelled: { label: 'Cancelled', color: 'var(--text-faint)', bg: 'var(--surface-alt)', icon: '⚫' },
  completed: { label: 'Completed', color: 'var(--text-muted)', bg: 'var(--surface-alt)', icon: '✅' },
};

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime12(time: string) {
  const parts = time.split(':');
  const hour = parseInt(parts[0]);
  const min = parts[1];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${min} ${ampm}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ManageBookingsPage() {
  const { activeMembership, isAdmin } = useAuth();
  const supabase = createClient();
  const communityId = activeMembership?.community_id;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  // Filters for All tab
  const [filterFacility, setFilterFacility] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Action states
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [actionMsg, setActionMsg] = useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    if (!communityId) return;

    const { data: bookData } = await supabase
      .from('facility_bookings')
      .select('*, facility:facilities(name, location, booking_config, type_id), user:users(full_name, email, phone)')
      .eq('community_id', communityId)
      .order('booking_date', { ascending: true })
      .order('start_time', { ascending: true });
    if (bookData) setBookings(bookData);

    // Only fetch bookable facilities (exclude walk-in)
    const { data: facData } = await supabase
      .from('facilities')
      .select('id, name, booking_config, type_id')
      .eq('community_id', communityId)
      .eq('is_active', true);
    if (facData) {
      setFacilities(facData.filter((f: any) => f.booking_config?.mode === 'slot_booking'));
    }

    setLoading(false);
  }, [communityId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Pending: only bookings from facilities that require approval + status pending
  const pendingBookings = bookings.filter(
    (b) => b.status === 'pending' && b.facility?.booking_config?.requires_approval
  ).sort((a, b) => a.booking_date.localeCompare(b.booking_date) || a.start_time.localeCompare(b.start_time));

  const hasApprovalFacilities = facilities.some((f) => f.booking_config?.requires_approval);

  // All bookings filtered
  const getFilteredBookings = () => {
    let filtered = bookings;
    if (filterFacility !== 'all') filtered = filtered.filter((b) => b.facility_id === filterFacility);
    if (filterStatus !== 'all') filtered = filtered.filter((b) => b.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((b) =>
        b.user?.full_name?.toLowerCase().includes(q) ||
        b.user?.email?.toLowerCase().includes(q) ||
        b.facility?.name?.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  // Actions
  const handleApprove = async (bookingId: string) => {
    setActionId(bookingId);
    const { error } = await supabase.from('facility_bookings').update({ status: 'approved' }).eq('id', bookingId);
    setActionId(null);
    if (error) {
      setActionMsg({ id: bookingId, type: 'error', text: 'Failed to approve.' });
    } else {
      setActionMsg({ id: bookingId, type: 'success', text: 'Approved!' });
      fetchData();
    }
    setTimeout(() => setActionMsg(null), 3000);
  };

  const handleReject = async (bookingId: string) => {
    setActionId(bookingId);
    const { error } = await supabase.from('facility_bookings').update({
      status: 'rejected',
      admin_notes: rejectNotes.trim() || null,
    }).eq('id', bookingId);
    setActionId(null); setRejectingId(null); setRejectNotes('');
    if (error) {
      setActionMsg({ id: bookingId, type: 'error', text: 'Failed to reject.' });
    } else {
      setActionMsg({ id: bookingId, type: 'success', text: 'Rejected.' });
      fetchData();
    }
    setTimeout(() => setActionMsg(null), 3000);
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Cancel this booking?')) return;
    setActionId(bookingId);
    const { error } = await supabase.from('facility_bookings').update({ status: 'cancelled' }).eq('id', bookingId);
    setActionId(null);
    if (!error) fetchData();
  };

  const handleMarkPaid = async (bookingId: string) => {
    setActionId(bookingId);
    const { error } = await supabase.from('facility_bookings').update({ payment_status: 'paid' }).eq('id', bookingId);
    setActionId(null);
    if (!error) fetchData();
  };

  const handleMarkRefunded = async (bookingId: string) => {
    setActionId(bookingId);
    const { error } = await supabase.from('facility_bookings').update({ payment_status: 'refunded' }).eq('id', bookingId);
    setActionId(null);
    if (!error) fetchData();
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
    </div>
  );

  // ──── Booking Card Component ────
  const BookingCard = ({ booking, showActions, isPending }: { booking: Booking; showActions: boolean; isPending: boolean }) => {
    const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
    const fee = booking.facility?.booking_config?.fee;
    const isProcessing = actionId === booking.id;
    const msg = actionMsg?.id === booking.id ? actionMsg : null;
    const isRejecting = rejectingId === booking.id;
    const bookingPast = new Date(`${booking.booking_date}T${booking.end_time}`) < new Date();

    return (
      <div style={{
        background: 'var(--surface)', border: isPending ? '1px solid color-mix(in srgb, var(--warning) 30%, var(--border))' : '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        opacity: bookingPast && !isPending ? 0.6 : 1,
      }}>
        <div style={{ height: 3, background: isPending ? 'var(--warning)' : status.color }} />

        <div style={{ padding: '14px 18px' }}>
          {/* Header: resident + status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                {booking.user?.full_name || 'Unknown'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                {booking.user?.email}{booking.user?.phone ? ` · ${booking.user.phone}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: status.bg, color: status.color }}>
                {status.icon} {status.label}
              </span>
              {booking.payment_status !== 'not_required' && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)',
                  background: booking.payment_status === 'paid' ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : booking.payment_status === 'refunded' ? 'var(--surface-alt)' : 'color-mix(in srgb, var(--error) 12%, transparent)',
                  color: booking.payment_status === 'paid' ? 'var(--primary)' : booking.payment_status === 'refunded' ? 'var(--text-muted)' : 'var(--error)',
                }}>
                  {booking.payment_status === 'paid' ? '✅' : booking.payment_status === 'refunded' ? '↩' : '💰'} {booking.payment_status}{fee ? ` £${fee.amount}` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Facility + date + time */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{booking.facility?.name}</span>
            {booking.facility?.location && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>📍 {booking.facility.location}</span>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', marginBottom: isPending ? 14 : 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>📅 {formatDate(booking.booking_date)}</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>🕐 {formatTime12(booking.start_time)} – {formatTime12(booking.end_time)}</span>
            <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>Requested {timeAgo(booking.created_at)}</span>
          </div>

          {/* Admin notes */}
          {booking.admin_notes && (
            <div style={{ padding: '6px 10px', background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
              <strong>Note:</strong> {booking.admin_notes}
            </div>
          )}

          {/* Action message */}
          {msg && (
            <div style={{ fontSize: 12, fontWeight: 600, color: msg.type === 'success' ? 'var(--primary)' : 'var(--error)', marginBottom: 8 }}>
              {msg.type === 'success' ? '✅' : '❌'} {msg.text}
            </div>
          )}

          {/* Pending actions */}
          {showActions && isPending && booking.status === 'pending' && (
            <div>
              {isRejecting ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    placeholder="Reason for rejection (optional)..."
                    rows={2}
                    style={{ resize: 'vertical', minHeight: 40, fontSize: 12 }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setRejectingId(null); setRejectNotes(''); }} className="btn-secondary" style={{ fontSize: 11, padding: '6px 14px' }}>Back</button>
                    <button onClick={() => handleReject(booking.id)} disabled={isProcessing} style={{
                      padding: '6px 14px', borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--error)', background: 'var(--error)', color: 'white',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
                      opacity: isProcessing ? 0.5 : 1,
                    }}>
                      {isProcessing ? 'Rejecting...' : 'Confirm Reject'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleApprove(booking.id)} disabled={isProcessing} style={{
                    padding: '8px 20px', borderRadius: 'var(--radius-full)',
                    border: 'none', background: 'var(--primary)', color: 'white',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
                    flex: 1, opacity: isProcessing ? 0.5 : 1,
                  }}>
                    {isProcessing ? '...' : '✅ Approve'}
                  </button>
                  <button onClick={() => setRejectingId(booking.id)} disabled={isProcessing} style={{
                    padding: '8px 20px', borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--error)', background: 'transparent', color: 'var(--error)',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
                    flex: 1, opacity: isProcessing ? 0.5 : 1,
                  }}>
                    ❌ Reject
                  </button>
                </div>
              )}
            </div>
          )}

          {/* All tab actions */}
          {showActions && !isPending && (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 }}>
              {/* Mark as paid */}
              {booking.payment_status === 'unpaid' && (booking.status === 'approved' || booking.status === 'completed') && (
                <button onClick={() => handleMarkPaid(booking.id)} disabled={isProcessing} style={{
                  padding: '5px 12px', borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--primary)', background: 'var(--primary-glow)',
                  color: 'var(--primary)', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>
                  💰 Mark Paid
                </button>
              )}
              {/* Refund */}
              {booking.payment_status === 'paid' && booking.status === 'cancelled' && (
                <button onClick={() => handleMarkRefunded(booking.id)} disabled={isProcessing} style={{
                  padding: '5px 12px', borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--text-muted)', background: 'transparent',
                  color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>
                  ↩ Mark Refunded
                </button>
              )}
              {/* Cancel */}
              {(booking.status === 'approved' || booking.status === 'pending') && (
                <button onClick={() => handleCancel(booking.id)} disabled={isProcessing} style={{
                  padding: '5px 12px', borderRadius: 'var(--radius-full)',
                  border: '1px solid color-mix(in srgb, var(--error) 40%, transparent)', background: 'transparent',
                  color: 'var(--error)', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const filteredAll = getFilteredBookings();

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--text)', marginBottom: 6 }}>Manage Bookings</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
          Review and manage facility bookings
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {hasApprovalFacilities && (
          <button onClick={() => setActiveTab('pending')} style={{
            padding: '8px 16px', borderRadius: 'var(--radius-full)',
            border: activeTab === 'pending' ? '1px solid var(--warning)' : '1px solid var(--border)',
            background: activeTab === 'pending' ? 'color-mix(in srgb, var(--warning) 12%, transparent)' : 'transparent',
            color: activeTab === 'pending' ? 'var(--warning)' : 'var(--text-muted)',
            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            position: 'relative',
          }}>
            Pending Approval ({pendingBookings.length})
            {pendingBookings.length > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--error)',
              }} />
            )}
          </button>
        )}
        <button onClick={() => setActiveTab('all')} style={{
          padding: '8px 16px', borderRadius: 'var(--radius-full)',
          border: activeTab === 'all' ? '1px solid var(--primary)' : '1px solid var(--border)',
          background: activeTab === 'all' ? 'var(--primary-glow)' : 'transparent',
          color: activeTab === 'all' ? 'var(--primary)' : 'var(--text-muted)',
          fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          All Bookings ({bookings.length})
        </button>
      </div>

      {/* ════════ PENDING TAB ════════ */}
      {activeTab === 'pending' && (
        <>
          {pendingBookings.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No bookings pending approval.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingBookings.map((b) => (
                <BookingCard key={b.id} booking={b} showActions={true} isPending={true} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ════════ ALL BOOKINGS TAB ════════ */}
      {activeTab === 'all' && (
        <>
          {/* Filters */}
          <div className="manage-bookings-filters" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search resident..." style={{ width: 180, padding: '8px 12px', fontSize: 11, borderRadius: 'var(--radius-full)' }} />
            <select value={filterFacility} onChange={(e) => setFilterFacility(e.target.value)} style={{ fontSize: 11, padding: '8px 12px', borderRadius: 'var(--radius-full)', minWidth: 140 }}>
              <option value="all">All Facilities</option>
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ fontSize: 11, padding: '8px 12px', borderRadius: 'var(--radius-full)', minWidth: 120 }}>
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {filteredAll.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '36px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>
                {searchQuery || filterFacility !== 'all' || filterStatus !== 'all' ? 'No bookings match your filters.' : 'No bookings yet.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredAll.map((b) => (
                <BookingCard key={b.id} booking={b} showActions={true} isPending={false} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}