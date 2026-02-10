'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { createClient } from '../../../lib/supabase-browser';

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
  facility: { name: string; location: string | null; image_url: string | null; booking_config: any; type_id: string } | null;
  facility_type?: { name: string; icon: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Pending', color: 'var(--warning)', bg: 'color-mix(in srgb, var(--warning) 12%, transparent)', icon: '🟡' },
  approved: { label: 'Approved', color: 'var(--primary)', bg: 'color-mix(in srgb, var(--primary) 12%, transparent)', icon: '🟢' },
  rejected: { label: 'Rejected', color: 'var(--error)', bg: 'color-mix(in srgb, var(--error) 12%, transparent)', icon: '🔴' },
  cancelled: { label: 'Cancelled', color: 'var(--text-faint)', bg: 'var(--surface-alt)', icon: '⚫' },
  completed: { label: 'Completed', color: 'var(--text-muted)', bg: 'var(--surface-alt)', icon: '✅' },
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  unpaid: { label: 'Unpaid', color: 'var(--error)', bg: 'color-mix(in srgb, var(--error) 12%, transparent)' },
  paid: { label: 'Paid', color: 'var(--primary)', bg: 'color-mix(in srgb, var(--primary) 12%, transparent)' },
  refunded: { label: 'Refunded', color: 'var(--text-muted)', bg: 'var(--surface-alt)' },
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

function isUpcoming(booking: Booking) {
  const now = new Date();
  const bookingDateTime = new Date(`${booking.booking_date}T${booking.end_time}`);
  return bookingDateTime >= now && (booking.status === 'pending' || booking.status === 'approved');
}

function isPast(booking: Booking) {
  const now = new Date();
  const bookingDateTime = new Date(`${booking.booking_date}T${booking.end_time}`);
  return bookingDateTime < now || booking.status === 'completed' || booking.status === 'rejected' || booking.status === 'cancelled';
}

export default function BookingsPage() {
  const { activeMembership, user } = useAuth();
  const supabase = createClient();
  const communityId = activeMembership?.community_id;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [facilityTypes, setFacilityTypes] = useState<Record<string, { name: string; icon: string }>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!communityId || !user?.id) return;

    const { data: bookData } = await supabase
      .from('facility_bookings')
      .select('*, facility:facilities(name, location, image_url, booking_config, type_id)')
      .eq('community_id', communityId)
      .eq('user_id', user.id)
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false });

    if (bookData) {
      setBookings(bookData);

      // Fetch facility types for icons
      const typeIds = [...new Set(bookData.map((b: any) => b.facility?.type_id).filter(Boolean))];
      if (typeIds.length > 0) {
        const { data: typeData } = await supabase
          .from('facility_types')
          .select('id, name, icon')
          .in('id', typeIds);
        if (typeData) {
          const map: Record<string, { name: string; icon: string }> = {};
          typeData.forEach((t: any) => { map[t.id] = { name: t.name, icon: t.icon }; });
          setFacilityTypes(map);
        }
      }
    }

    setLoading(false);
  }, [communityId, user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getFilteredBookings = () => {
    switch (activeTab) {
      case 'upcoming': return bookings.filter(isUpcoming).sort((a, b) => a.booking_date.localeCompare(b.booking_date) || a.start_time.localeCompare(b.start_time));
      case 'past': return bookings.filter(isPast);
      case 'all': return bookings;
    }
  };

  const upcomingCount = bookings.filter(isUpcoming).length;
  const pastCount = bookings.filter(isPast).length;

  const canCancel = (booking: Booking) => {
    if (booking.status !== 'pending' && booking.status !== 'approved') return false;
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    if (bookingDateTime < new Date()) return false;
    return true;
  };

  const getCancelWarning = (booking: Booking) => {
    const config = booking.facility?.booking_config;
    const cancelHours = config?.cancellation_hours;
    if (!cancelHours) return null;

    const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
    const hoursUntil = (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < cancelHours) {
      return `This booking is within the ${cancelHours}-hour cancellation window.`;
    }
    return null;
  };

  const handleCancel = async (booking: Booking) => {
    const warning = getCancelWarning(booking);
    const msg = warning
      ? `${warning}\n\nAre you sure you want to cancel?`
      : 'Cancel this booking?';
    if (!confirm(msg)) return;

    setCancellingId(booking.id);
    await supabase.from('facility_bookings').update({ status: 'cancelled' }).eq('id', booking.id);
    setCancellingId(null);
    fetchData();
  };

  const filteredBookings = getFilteredBookings();

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--text)', marginBottom: 6 }}>My Bookings</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
          Your facility bookings in {activeMembership?.community?.name}
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {([
          { key: 'upcoming', label: 'Upcoming', count: upcomingCount },
          { key: 'past', label: 'Past', count: pastCount },
          { key: 'all', label: 'All', count: bookings.length },
        ] as const).map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '8px 16px', borderRadius: 'var(--radius-full)',
            border: activeTab === tab.key ? '1px solid var(--primary)' : '1px solid var(--border)',
            background: activeTab === tab.key ? 'var(--primary-glow)' : 'transparent',
            color: activeTab === tab.key ? 'var(--primary)' : 'var(--text-muted)',
            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Bookings list */}
      {filteredBookings.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>
            {activeTab === 'upcoming' ? '📅' : activeTab === 'past' ? '📋' : '🏊'}
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
            {activeTab === 'upcoming'
              ? "You don't have any upcoming bookings."
              : activeTab === 'past'
              ? 'No past bookings yet.'
              : 'No bookings yet.'}
          </p>
          {activeTab === 'upcoming' && (
            <a href="/facilities" style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
              Browse Facilities →
            </a>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredBookings.map((booking) => {
            const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
            const payment = booking.payment_status !== 'not_required' ? PAYMENT_CONFIG[booking.payment_status] : null;
            const facilityType = booking.facility?.type_id ? facilityTypes[booking.facility.type_id] : null;
            const fee = booking.facility?.booking_config?.fee;
            const isCancelling = cancellingId === booking.id;
            const isOld = isPast(booking);

            return (
              <div key={booking.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                opacity: isOld ? 0.7 : 1,
              }}>
                {/* Color stripe by status */}
                <div style={{ height: 3, background: status.color }} />

                <div style={{ padding: '14px 18px' }}>
                  {/* Top row: facility info + status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 0 }}>
                      {/* Icon */}
                      <div style={{
                        width: 44, height: 44, borderRadius: 'var(--radius-md)',
                        background: 'var(--surface-alt)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, flexShrink: 0,
                      }}>
                        {facilityType?.icon || '🏢'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                          {booking.facility?.name || 'Unknown Facility'}
                        </div>
                        {facilityType && (
                          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{facilityType.name}</span>
                        )}
                      </div>
                    </div>

                    {/* Status + payment badges */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 10px',
                        borderRadius: 'var(--radius-full)', background: status.bg, color: status.color,
                      }}>
                        {status.icon} {status.label}
                      </span>
                      {payment && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 10px',
                          borderRadius: 'var(--radius-full)', background: payment.bg, color: payment.color,
                        }}>
                          {payment.label}{fee ? ` £${fee.amount}` : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date + time + location */}
                  <div className="booking-details-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13 }}>📅</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        {formatDate(booking.booking_date)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13 }}>🕐</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {formatTime12(booking.start_time)} – {formatTime12(booking.end_time)}
                      </span>
                    </div>
                    {booking.facility?.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13 }}>📍</span>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-faint)' }}>
                          {booking.facility.location}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Admin notes */}
                  {booking.admin_notes && (
                    <div style={{
                      marginTop: 10, padding: '8px 12px',
                      background: 'var(--surface-alt)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-muted)',
                      lineHeight: 1.5,
                    }}>
                      <span style={{ fontWeight: 600 }}>Admin note:</span> {booking.admin_notes}
                    </div>
                  )}

                  {/* Cancel button */}
                  {canCancel(booking) && (
                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleCancel(booking)}
                        disabled={isCancelling}
                        style={{
                          padding: '6px 16px', borderRadius: 'var(--radius-full)',
                          border: '1px solid color-mix(in srgb, var(--error) 40%, transparent)',
                          background: 'transparent', color: 'var(--error)',
                          fontSize: 11, fontWeight: 700, cursor: 'pointer',
                          fontFamily: 'var(--font-body)',
                          opacity: isCancelling ? 0.5 : 1,
                        }}
                      >
                        {isCancelling ? 'Cancelling...' : 'Cancel Booking'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}