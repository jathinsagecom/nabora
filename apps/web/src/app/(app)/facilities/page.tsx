'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { createClient } from '../../../lib/supabase-browser';

// ──── TYPES ────

interface FacilityType {
  id: string;
  name: string;
  icon: string;
  image_url: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

interface Facility {
  id: string;
  type_id: string;
  name: string;
  description: string | null;
  location: string | null;
  image_url: string | null;
  booking_config: any;
  is_active: boolean;
  sort_order: number;
  created_by: string;
}

interface Booking {
  id: string;
  facility_id: string;
  user_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  payment_status: string;
  admin_notes: string | null;
  created_at: string;
  facility?: { name: string } | null;
  user?: { full_name: string } | null;
}

// ──── CONSTANTS ────

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS: Record<string, string> = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const SLOT_DURATIONS = [
  { value: 30, label: '30 minutes' }, { value: 60, label: '1 hour' }, { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' }, { value: 180, label: '3 hours' }, { value: 240, label: '4 hours' },
  { value: 480, label: 'Half day (8hr)' }, { value: 960, label: 'Full day (16hr)' },
];
const EMOJI_OPTIONS = ['🏋️', '🏊', '🎉', '🔥', '💻', '🧘', '🎾', '🏢', '🌿', '🚗', '🎬', '🧹'];

const DEFAULT_HOURS: Record<string, { open: boolean; start: string; end: string }> = {
  mon: { open: true, start: '06:00', end: '22:00' },
  tue: { open: true, start: '06:00', end: '22:00' },
  wed: { open: true, start: '06:00', end: '22:00' },
  thu: { open: true, start: '06:00', end: '22:00' },
  fri: { open: true, start: '06:00', end: '22:00' },
  sat: { open: true, start: '08:00', end: '20:00' },
  sun: { open: true, start: '08:00', end: '20:00' },
};

function formatTime12(time: string) {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function getOpenDaysSummary(config: any) {
  if (!config?.opening_hours) return 'No hours set';
  const days = DAYS.filter((d) => config.opening_hours[d]);
  if (days.length === 7) return 'Open every day';
  if (days.length === 0) return 'Closed';
  if (days.length === 5 && !config.opening_hours.sat && !config.opening_hours.sun) return 'Mon – Fri';
  if (days.length === 2 && config.opening_hours.sat && config.opening_hours.sun) return 'Weekends only';
  return days.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
}

// ──── MAIN COMPONENT ────

export default function FacilitiesPage() {
  const { activeMembership, isAdmin, user } = useAuth();
  const supabase = createClient();
  const communityId = activeMembership?.community_id;

  const [types, setTypes] = useState<FacilityType[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation
  const [activeType, setActiveType] = useState<FacilityType | null>(null);
  const [activeFacility, setActiveFacility] = useState<Facility | null>(null);

  // Type form
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editingType, setEditingType] = useState<FacilityType | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeIcon, setTypeIcon] = useState('🏢');
  const [typeImageUrl, setTypeImageUrl] = useState('');
  const [typeDescription, setTypeDescription] = useState('');
  const [typeSubmitting, setTypeSubmitting] = useState(false);
  const [typeError, setTypeError] = useState('');

  // Facility form
  const [showFacilityForm, setShowFacilityForm] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [facName, setFacName] = useState('');
  const [facDescription, setFacDescription] = useState('');
  const [facLocation, setFacLocation] = useState('');
  const [facImageUrl, setFacImageUrl] = useState('');
  const [facMode, setFacMode] = useState<'walk_in' | 'slot_booking'>('slot_booking');
  const [facHours, setFacHours] = useState<Record<string, { open: boolean; start: string; end: string }>>(JSON.parse(JSON.stringify(DEFAULT_HOURS)));
  const [facSlotDuration, setFacSlotDuration] = useState(60);
  const [facCapacity, setFacCapacity] = useState(10);
  const [facMaxAdvanceDays, setFacMaxAdvanceDays] = useState(7);
  const [facMaxActiveBookings, setFacMaxActiveBookings] = useState(2);
  const [facRequiresApproval, setFacRequiresApproval] = useState(false);
  const [facHasFee, setFacHasFee] = useState(false);
  const [facFeeAmount, setFacFeeAmount] = useState('');
  const [facDeposit, setFacDeposit] = useState('');
  const [facBufferMinutes, setFacBufferMinutes] = useState('');
  const [facCancellationHours, setFacCancellationHours] = useState('');
  const [facAllowMultiSlot, setFacAllowMultiSlot] = useState(false);
  const [facSubmitting, setFacSubmitting] = useState(false);
  const [facError, setFacError] = useState('');

  // Booking state (Level 3)
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [bookingConfirming, setBookingConfirming] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // ──── DATA FETCH ────

  const fetchData = useCallback(async () => {
    if (!communityId) return;

    const { data: typeData } = await supabase
      .from('facility_types')
      .select('*')
      .eq('community_id', communityId)
      .eq('is_active', true)
      .order('sort_order').order('name');
    if (typeData) setTypes(typeData);

    const { data: facData } = await supabase
      .from('facilities')
      .select('*')
      .eq('community_id', communityId)
      .order('sort_order').order('name');
    if (facData) setFacilities(facData);

    const { data: bookData } = await supabase
      .from('facility_bookings')
      .select('*, facility:facilities(name), user:users(full_name)')
      .eq('community_id', communityId)
      .order('booking_date', { ascending: true });
    if (bookData) setBookings(bookData);

    setLoading(false);
  }, [communityId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getFacilitiesByType = (typeId: string) => facilities.filter((f) => f.type_id === typeId && (isAdmin || f.is_active));
  const getBookingsForFacility = (facilityId: string, date: string) =>
    bookings.filter((b) => b.facility_id === facilityId && b.booking_date === date && (b.status === 'pending' || b.status === 'approved'));

  // ──── TYPE CRUD ────

  const openTypeCreate = () => {
    setEditingType(null); setTypeName(''); setTypeIcon('🏢'); setTypeImageUrl(''); setTypeDescription('');
    setTypeError(''); setShowTypeForm(true);
  };

  const openTypeEdit = (t: FacilityType) => {
    setEditingType(t); setTypeName(t.name); setTypeIcon(t.icon); setTypeImageUrl(t.image_url || ''); setTypeDescription(t.description || '');
    setTypeError(''); setShowTypeForm(true);
  };

  const handleTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setTypeSubmitting(true); setTypeError('');
    const payload = { community_id: communityId, name: typeName.trim(), icon: typeIcon, image_url: typeImageUrl.trim() || null, description: typeDescription.trim() || null, sort_order: editingType?.sort_order || types.length };
    if (editingType) {
      const { error } = await supabase.from('facility_types').update(payload).eq('id', editingType.id);
      if (error) { setTypeError(error.message); setTypeSubmitting(false); return; }
    } else {
      const { error } = await supabase.from('facility_types').insert(payload);
      if (error) { setTypeError(error.message); setTypeSubmitting(false); return; }
    }
    setTypeSubmitting(false); setShowTypeForm(false); setEditingType(null); fetchData();
  };

  const handleTypeDelete = async (t: FacilityType) => {
    const facCount = getFacilitiesByType(t.id).length;
    if (!confirm(`Delete "${t.name}"${facCount > 0 ? ` and its ${facCount} facilities` : ''}?`)) return;
    await supabase.from('facility_types').delete().eq('id', t.id);
    if (activeType?.id === t.id) setActiveType(null);
    fetchData();
  };

  // ──── FACILITY CRUD ────

  const buildConfigFromForm = () => {
    const opening_hours: Record<string, string | null> = {};
    DAYS.forEach((d) => {
      opening_hours[d] = facHours[d].open ? `${facHours[d].start}-${facHours[d].end}` : null;
    });

    if (facMode === 'walk_in') {
      return { mode: 'walk_in', opening_hours };
    }

    const config: any = {
      mode: 'slot_booking',
      slot_duration_minutes: facSlotDuration,
      capacity_per_slot: facCapacity,
      max_advance_days: facMaxAdvanceDays,
      max_active_bookings: facMaxActiveBookings,
      requires_approval: facRequiresApproval,
      allow_multi_slot: facAllowMultiSlot,
      opening_hours,
      fee: null,
    };

    if (facHasFee && facFeeAmount) {
      config.fee = { amount: parseFloat(facFeeAmount), currency: 'GBP' };
      if (facDeposit) config.fee.refundable_deposit = parseFloat(facDeposit);
    }
    if (facBufferMinutes) config.buffer_minutes = parseInt(facBufferMinutes);
    if (facCancellationHours) config.cancellation_hours = parseInt(facCancellationHours);

    return config;
  };

  const loadConfigToForm = (config: any) => {
    setFacMode(config.mode || 'slot_booking');
    const hours = JSON.parse(JSON.stringify(DEFAULT_HOURS));
    if (config.opening_hours) {
      DAYS.forEach((d) => {
        if (config.opening_hours[d]) {
          const [start, end] = config.opening_hours[d].split('-');
          hours[d] = { open: true, start, end };
        } else {
          hours[d] = { open: false, start: '06:00', end: '22:00' };
        }
      });
    }
    setFacHours(hours);
    if (config.mode === 'slot_booking') {
      setFacSlotDuration(config.slot_duration_minutes || 60);
      setFacCapacity(config.capacity_per_slot || 10);
      setFacMaxAdvanceDays(config.max_advance_days || 7);
      setFacMaxActiveBookings(config.max_active_bookings || 2);
      setFacRequiresApproval(config.requires_approval || false);
      setFacAllowMultiSlot(config.allow_multi_slot || false);
      setFacHasFee(!!config.fee);
      setFacFeeAmount(config.fee?.amount?.toString() || '');
      setFacDeposit(config.fee?.refundable_deposit?.toString() || '');
      setFacBufferMinutes(config.buffer_minutes?.toString() || '');
      setFacCancellationHours(config.cancellation_hours?.toString() || '');
    }
  };

  const openFacilityCreate = () => {
    setEditingFacility(null); setFacName(''); setFacDescription(''); setFacLocation(''); setFacImageUrl('');
    setFacMode('slot_booking'); setFacHours(JSON.parse(JSON.stringify(DEFAULT_HOURS)));
    setFacSlotDuration(60); setFacCapacity(10); setFacMaxAdvanceDays(7); setFacMaxActiveBookings(2);
    setFacRequiresApproval(false); setFacHasFee(false); setFacFeeAmount(''); setFacDeposit('');
    setFacBufferMinutes(''); setFacCancellationHours(''); setFacAllowMultiSlot(false);
    setFacError(''); setShowFacilityForm(true);
  };

  const openFacilityEdit = (f: Facility) => {
    setEditingFacility(f); setFacName(f.name); setFacDescription(f.description || ''); setFacLocation(f.location || ''); setFacImageUrl(f.image_url || '');
    loadConfigToForm(f.booking_config);
    setFacError(''); setShowFacilityForm(true);
  };

  const handleFacilitySubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFacSubmitting(true); setFacError('');
    const config = buildConfigFromForm();
    const payload = {
      community_id: communityId, type_id: activeType!.id, name: facName.trim(),
      description: facDescription.trim() || null, location: facLocation.trim() || null,
      image_url: facImageUrl.trim() || null, booking_config: config,
      is_active: true, sort_order: editingFacility?.sort_order || getFacilitiesByType(activeType!.id).length,
      created_by: user?.id,
    };
    if (editingFacility) {
      const { created_by, ...updatePayload } = payload;
      const { error } = await supabase.from('facilities').update(updatePayload).eq('id', editingFacility.id);
      if (error) { setFacError(error.message); setFacSubmitting(false); return; }
    } else {
      const { error } = await supabase.from('facilities').insert(payload);
      if (error) { setFacError(error.message); setFacSubmitting(false); return; }
    }
    setFacSubmitting(false); setShowFacilityForm(false); setEditingFacility(null); fetchData();
  };

  const handleFacilityDelete = async (f: Facility) => {
    if (!confirm(`Delete "${f.name}"?`)) return;
    await supabase.from('facilities').delete().eq('id', f.id);
    if (activeFacility?.id === f.id) setActiveFacility(null);
    fetchData();
  };

  const handleFacilityToggle = async (f: Facility) => {
    await supabase.from('facilities').update({ is_active: !f.is_active }).eq('id', f.id);
    fetchData();
  };

  // ──── BOOKING LOGIC (Level 3) ────

  const generateTimeSlots = (facility: Facility, date: string) => {
    const config = facility.booking_config;
    if (config.mode !== 'slot_booking') return [];

    const dayOfWeek = DAYS[new Date(date + 'T00:00:00').getDay() === 0 ? 6 : new Date(date + 'T00:00:00').getDay() - 1];
    const hoursStr = config.opening_hours?.[dayOfWeek];
    if (!hoursStr) return [];

    const [openTime, closeTime] = hoursStr.split('-');
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    const duration = config.slot_duration_minutes || 60;
    const buffer = config.buffer_minutes || 0;

    const slots: { start: string; end: string }[] = [];
    let currentMin = openH * 60 + openM;
    const endMin = closeH * 60 + closeM;

    while (currentMin + duration <= endMin) {
      const startH = Math.floor(currentMin / 60);
      const startM = currentMin % 60;
      const endSlotMin = currentMin + duration;
      const endSlotH = Math.floor(endSlotMin / 60);
      const endSlotM = endSlotMin % 60;

      slots.push({
        start: `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
        end: `${String(endSlotH).padStart(2, '0')}:${String(endSlotM).padStart(2, '0')}`,
      });

      currentMin = endSlotMin + buffer;
    }

    return slots;
  };

  const getSlotAvailability = (facility: Facility, date: string, slot: { start: string; end: string }) => {
    const config = facility.booking_config;
    const booked = getBookingsForFacility(facility.id, date).filter(
      (b) => b.start_time === slot.start + ':00' || b.start_time === slot.start
    ).length;
    const capacity = config.capacity_per_slot || 1;
    return { booked, capacity, available: capacity - booked, isFull: booked >= capacity };
  };

  const getUserActiveBookings = (facilityId: string) => {
    return bookings.filter(
      (b) => b.facility_id === facilityId && b.user_id === user?.id && (b.status === 'pending' || b.status === 'approved')
    ).length;
  };

  const handleBookSlot = async () => {
    if (!activeFacility || !selectedDate || !selectedSlot) return;
    setBookingConfirming(true); setBookingError(''); setBookingSuccess('');

    const config = activeFacility.booking_config;

    // Check max active bookings
    const activeCount = getUserActiveBookings(activeFacility.id);
    if (activeCount >= (config.max_active_bookings || 999)) {
      setBookingError(`You've reached the maximum of ${config.max_active_bookings} active bookings.`);
      setBookingConfirming(false); return;
    }

    // Check availability again
    const avail = getSlotAvailability(activeFacility, selectedDate, selectedSlot);
    if (avail.isFull) {
      setBookingError('This slot is now full. Please choose another.');
      setBookingConfirming(false); return;
    }

    const status = config.requires_approval ? 'pending' : 'approved';
    const paymentStatus = config.fee ? 'unpaid' : 'not_required';

    const { error } = await supabase.from('facility_bookings').insert({
      community_id: communityId,
      facility_id: activeFacility.id,
      user_id: user?.id,
      booking_date: selectedDate,
      start_time: selectedSlot.start,
      end_time: selectedSlot.end,
      status,
      payment_status: paymentStatus,
    });

    if (error) {
      setBookingError(error.message);
    } else {
      const msg = config.requires_approval
        ? 'Booking submitted — awaiting admin approval.'
        : 'Booking confirmed!';
      const feeMsg = config.fee ? ` Payment of £${config.fee.amount} is due.` : '';
      setBookingSuccess(msg + feeMsg);
      setSelectedSlot(null);
      fetchData();
    }
    setBookingConfirming(false);
  };

  // ──── CALENDAR HELPERS ────

  const getMonthDays = () => {
    const firstDay = new Date(calYear, calMonth, 1);
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: { day: number; dateStr: string; isCurrentMonth: boolean; isDisabled: boolean }[] = [];
    const daysInPrev = new Date(calYear, calMonth, 0).getDate();

    for (let i = startDay - 1; i >= 0; i--) {
      cells.push({ day: daysInPrev - i, dateStr: '', isCurrentMonth: false, isDisabled: true });
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const maxDate = activeFacility?.booking_config?.max_advance_days
      ? new Date(today.getTime() + activeFacility.booking_config.max_advance_days * 86400000)
      : new Date(today.getTime() + 365 * 86400000);

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(calYear, calMonth, i);
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayKey = DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1];
      const isOpen = activeFacility?.booking_config?.opening_hours?.[dayKey] != null;
      const isPast = d < today;
      const isTooFar = d > maxDate;

      cells.push({ day: i, dateStr, isCurrentMonth: true, isDisabled: isPast || !isOpen || isTooFar });
    }

    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({ day: i, dateStr: '', isCurrentMonth: false, isDisabled: true });
    }

    return cells;
  };

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // ──── RENDER ────

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
    </div>
  );

  // ════════════════════════════════════════════════════════
  // LEVEL 3: Booking View
  // ════════════════════════════════════════════════════════
  if (activeFacility && activeFacility.booking_config.mode === 'slot_booking') {
    const config = activeFacility.booking_config;
    const slots = selectedDate ? generateTimeSlots(activeFacility, selectedDate) : [];
    const cells = getMonthDays();

    return (
      <div>
        {/* Back + header */}
        <button onClick={() => { setActiveFacility(null); setSelectedDate(''); setSelectedSlot(null); setBookingSuccess(''); setBookingError(''); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0 }}>
          ← Back to {activeType?.name}
        </button>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(20px, 4vw, 26px)', color: 'var(--text)', marginBottom: 4 }}>{activeFacility.name}</h1>
          {activeFacility.location && <p style={{ fontSize: 13, color: 'var(--text-faint)', marginBottom: 4 }}>📍 {activeFacility.location}</p>}
          {activeFacility.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{activeFacility.description}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'var(--primary-glow)', color: 'var(--primary)' }}>⏱ {SLOT_DURATIONS.find((s) => s.value === config.slot_duration_minutes)?.label || config.slot_duration_minutes + 'min'}</span>
            {config.requires_approval && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'color-mix(in srgb, var(--warning) 15%, transparent)', color: 'var(--warning)' }}>Requires Approval</span>}
            {config.fee && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>£{config.fee.amount}</span>}
          </div>
        </div>

        <div className="booking-layout">
          {/* Calendar */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }} style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>‹</button>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{MONTH_NAMES[calMonth]} {calYear}</span>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }} style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px' }}>
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', padding: '4px 0' }}>{d}</div>
              ))}
              {cells.map((cell, i) => {
                const isSelected = cell.dateStr === selectedDate;
                const isToday = cell.dateStr === new Date().toISOString().split('T')[0];
                return (
                  <button key={i} disabled={cell.isDisabled || !cell.isCurrentMonth} onClick={() => { setSelectedDate(cell.dateStr); setSelectedSlot(null); setBookingError(''); setBookingSuccess(''); }} style={{
                    width: '100%', aspectRatio: '1', border: 'none', borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'var(--primary)' : isToday ? 'var(--primary-glow)' : 'transparent',
                    color: isSelected ? 'white' : !cell.isCurrentMonth || cell.isDisabled ? 'var(--text-faint)' : 'var(--text)',
                    fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: isSelected || isToday ? 700 : 400,
                    cursor: cell.isDisabled || !cell.isCurrentMonth ? 'default' : 'pointer',
                    opacity: !cell.isCurrentMonth ? 0.3 : cell.isDisabled ? 0.4 : 1,
                  }}>
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time slots */}
          <div>
            {!selectedDate ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '36px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Select a date to see available slots</p>
              </div>
            ) : slots.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '36px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--text-faint)' }}>No slots available on this date.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>

                {bookingSuccess && (
                  <div style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: 13, color: 'var(--primary)', fontWeight: 600, marginBottom: 4 }}>
                    ✅ {bookingSuccess}
                  </div>
                )}
                {bookingError && (
                  <div style={{ background: 'var(--error-bg)', border: '1px solid color-mix(in srgb, var(--error) 25%, transparent)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: 13, color: 'var(--error)', fontWeight: 600, marginBottom: 4 }}>
                    ❌ {bookingError}
                  </div>
                )}

                {slots.map((slot) => {
                  const avail = getSlotAvailability(activeFacility, selectedDate, slot);
                  const isSelected = selectedSlot?.start === slot.start;

                  return (
                    <button key={slot.start} disabled={avail.isFull} onClick={() => { setSelectedSlot(isSelected ? null : slot); setBookingError(''); setBookingSuccess(''); }} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: avail.isFull ? 'var(--surface-alt)' : isSelected ? 'var(--primary-glow)' : 'var(--surface)',
                      cursor: avail.isFull ? 'not-allowed' : 'pointer', opacity: avail.isFull ? 0.5 : 1,
                      width: '100%', textAlign: 'left', fontFamily: 'var(--font-body)',
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: isSelected ? 'var(--primary)' : 'var(--text)' }}>
                          {formatTime12(slot.start)} – {formatTime12(slot.end)}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)',
                        background: avail.isFull ? 'var(--error-bg)' : avail.available <= 2 ? 'color-mix(in srgb, var(--warning) 15%, transparent)' : 'color-mix(in srgb, var(--primary) 10%, transparent)',
                        color: avail.isFull ? 'var(--error)' : avail.available <= 2 ? 'var(--warning)' : 'var(--primary)',
                      }}>
                        {avail.isFull ? 'Full' : `${avail.available}/${avail.capacity}`}
                      </span>
                    </button>
                  );
                })}

                {/* Confirm button */}
                {selectedSlot && (
                  <div style={{ marginTop: 8, padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                      <strong>Confirm booking:</strong> {formatTime12(selectedSlot.start)} – {formatTime12(selectedSlot.end)}
                      {config.fee && <span style={{ display: 'block', marginTop: 4, color: 'var(--accent)', fontWeight: 700 }}>Fee: £{config.fee.amount}{config.fee.refundable_deposit ? ` + £${config.fee.refundable_deposit} deposit` : ''}</span>}
                    </div>
                    <button onClick={handleBookSlot} disabled={bookingConfirming} className="btn-primary" style={{ fontSize: 13, width: '100%' }}>
                      {bookingConfirming ? 'Booking...' : config.requires_approval ? 'Request Booking' : 'Confirm Booking'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // LEVEL 2: Facilities within a Type
  // ════════════════════════════════════════════════════════
  if (activeType) {
    const typeFacilities = getFacilitiesByType(activeType.id);

    return (
      <div>
        <button onClick={() => setActiveType(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0 }}>
          ← Back to Facilities
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--text)', marginBottom: 6 }}>{activeType.icon} {activeType.name}</h1>
            {activeType.description && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{activeType.description}</p>}
          </div>
          {isAdmin && (
            <button onClick={openFacilityCreate} className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: 12 }}>+ Add {activeType.name}</button>
          )}
        </div>

        {/* Facility form modal */}
        {showFacilityForm && (
          <>
            <div onClick={() => { setShowFacilityForm(false); setEditingFacility(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 600, maxHeight: '90vh', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow)', zIndex: 61, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--text)' }}>{editingFacility ? 'Edit Facility' : 'New Facility'}</h3>
                <button onClick={() => { setShowFacilityForm(false); setEditingFacility(null); }} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>

              <form onSubmit={handleFacilitySubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 12px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {facError && <div style={{ background: 'var(--error-bg)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--error)' }}>{facError}</div>}

                {/* Name + Location */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Name <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input type="text" value={facName} onChange={(e) => setFacName(e.target.value)} placeholder="e.g. Gym A" required />
                  </div>
                  <div>
                    <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Location</label>
                    <input type="text" value={facLocation} onChange={(e) => setFacLocation(e.target.value)} placeholder="e.g. Ground Floor" />
                  </div>
                </div>

                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Description</label>
                  <textarea value={facDescription} onChange={(e) => setFacDescription(e.target.value)} placeholder="Brief description..." rows={2} style={{ resize: 'vertical', minHeight: 40 }} />
                </div>

                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Image URL</label>
                  <input type="url" value={facImageUrl} onChange={(e) => setFacImageUrl(e.target.value)} placeholder="https://..." />
                </div>

                {/* Mode selector */}
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>Booking Mode</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { value: 'walk_in', label: 'Walk-in', desc: 'No booking needed', icon: '🚶' },
                      { value: 'slot_booking', label: 'Slot Booking', desc: 'Residents book time slots', icon: '📅' },
                    ].map((opt) => (
                      <button key={opt.value} type="button" onClick={() => setFacMode(opt.value as any)} style={{
                        padding: '14px', borderRadius: 'var(--radius-md)', textAlign: 'center',
                        border: facMode === opt.value ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: facMode === opt.value ? 'var(--primary-glow)' : 'var(--surface-alt)',
                        cursor: 'pointer',
                      }}>
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{opt.icon}</div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 700, color: facMode === opt.value ? 'var(--primary)' : 'var(--text)' }}>{opt.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opening hours */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Opening Hours</label>
                    <button type="button" onClick={() => {
                      const first = facHours.mon;
                      const copied = { ...facHours };
                      DAYS.forEach((d) => { copied[d] = { ...first }; });
                      setFacHours(copied);
                    }} style={{ fontSize: 10, color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                      Copy Mon to all
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {DAYS.map((d) => (
                      <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text)', width: 36 }}>{d.charAt(0).toUpperCase() + d.slice(1)}</span>
                        <button type="button" onClick={() => setFacHours({ ...facHours, [d]: { ...facHours[d], open: !facHours[d].open } })} style={{
                          width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                          background: facHours[d].open ? 'var(--primary)' : 'var(--border)', position: 'relative', flexShrink: 0,
                        }}>
                          <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: facHours[d].open ? 18 : 2, transition: 'left 0.2s ease' }} />
                        </button>
                        {facHours[d].open ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input type="time" value={facHours[d].start} onChange={(e) => setFacHours({ ...facHours, [d]: { ...facHours[d], start: e.target.value } })} style={{ width: 100, padding: '4px 6px', fontSize: 11 }} />
                            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>to</span>
                            <input type="time" value={facHours[d].end} onChange={(e) => setFacHours({ ...facHours, [d]: { ...facHours[d], end: e.target.value } })} style={{ width: 100, padding: '4px 6px', fontSize: 11 }} />
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Closed</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Slot booking settings */}
                {facMode === 'slot_booking' && (
                  <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', background: 'var(--surface-alt)' }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>Booking Settings</div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Slot Duration</label>
                        <select value={facSlotDuration} onChange={(e) => setFacSlotDuration(Number(e.target.value))} style={{ width: '100%', fontSize: 11 }}>
                          {SLOT_DURATIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Capacity per Slot</label>
                        <input type="number" min="1" value={facCapacity} onChange={(e) => setFacCapacity(Number(e.target.value))} style={{ fontSize: 11 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Max Advance Days</label>
                        <input type="number" min="1" value={facMaxAdvanceDays} onChange={(e) => setFacMaxAdvanceDays(Number(e.target.value))} style={{ fontSize: 11 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Max Active Bookings</label>
                        <input type="number" min="1" value={facMaxActiveBookings} onChange={(e) => setFacMaxActiveBookings(Number(e.target.value))} style={{ fontSize: 11 }} />
                      </div>
                    </div>

                    {/* Toggles */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      {[
                        { label: 'Requires Admin Approval', value: facRequiresApproval, setter: setFacRequiresApproval },
                        { label: 'Allow Multi-slot Booking', value: facAllowMultiSlot, setter: setFacAllowMultiSlot },
                      ].map((toggle) => (
                        <div key={toggle.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{toggle.label}</span>
                          <button type="button" onClick={() => toggle.setter(!toggle.value)} style={{
                            width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                            background: toggle.value ? 'var(--primary)' : 'var(--border)', position: 'relative',
                          }}>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: toggle.value ? 18 : 2, transition: 'left 0.2s ease' }} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Optional fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Buffer Minutes <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>(optional)</span></label>
                        <input type="number" min="0" value={facBufferMinutes} onChange={(e) => setFacBufferMinutes(e.target.value)} placeholder="e.g. 30" style={{ fontSize: 11 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Cancel Hours <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>(optional)</span></label>
                        <input type="number" min="0" value={facCancellationHours} onChange={(e) => setFacCancellationHours(e.target.value)} placeholder="e.g. 24" style={{ fontSize: 11 }} />
                      </div>
                    </div>

                    {/* Fee section */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: facHasFee ? 10 : 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>💰 Charge a Fee</span>
                        <button type="button" onClick={() => setFacHasFee(!facHasFee)} style={{
                          width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer',
                          background: facHasFee ? 'var(--primary)' : 'var(--border)', position: 'relative',
                        }}>
                          <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: facHasFee ? 18 : 2, transition: 'left 0.2s ease' }} />
                        </button>
                      </div>
                      {facHasFee && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Amount (£)</label>
                            <input type="number" min="0" step="0.01" value={facFeeAmount} onChange={(e) => setFacFeeAmount(e.target.value)} placeholder="0.00" style={{ fontSize: 11 }} />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Refundable Deposit (£) <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>(opt)</span></label>
                            <input type="number" min="0" step="0.01" value={facDeposit} onChange={(e) => setFacDeposit(e.target.value)} placeholder="0.00" style={{ fontSize: 11 }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </form>

              <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
                <button type="button" onClick={() => { setShowFacilityForm(false); setEditingFacility(null); }} className="btn-secondary" style={{ fontSize: 13 }}>Cancel</button>
                <button type="submit" form="fac-form" onClick={(e) => { e.preventDefault(); handleFacilitySubmit(e); }} className="btn-primary" disabled={facSubmitting || !facName.trim()} style={{ fontSize: 13 }}>
                  {facSubmitting ? 'Saving...' : editingFacility ? 'Save Changes' : 'Create Facility'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Facility cards */}
        {typeFacilities.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{activeType.icon}</div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No {activeType.name.toLowerCase()} facilities yet.</p>
          </div>
        ) : (
          <div className="facilities-grid">
            {typeFacilities.map((f) => {
              const config = f.booking_config;
              const isWalkIn = config.mode === 'walk_in';

              return (
                <div key={f.id} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                  opacity: f.is_active ? 1 : 0.5,
                }}>
                  {f.image_url && (
                    <div style={{ height: 140, overflow: 'hidden' }}>
                      <img src={f.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{f.name}</div>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)',
                        background: isWalkIn ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'color-mix(in srgb, var(--accent) 12%, transparent)',
                        color: isWalkIn ? 'var(--primary)' : 'var(--accent)',
                      }}>
                        {isWalkIn ? '🚶 Walk-in' : '📅 Bookable'}
                      </span>
                    </div>
                    {f.location && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 6 }}>📍 {f.location}</div>}
                    {f.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{f.description}</p>}

                    {/* Hours summary */}
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginBottom: 12 }}>
                      🕐 {getOpenDaysSummary(config)}
                    </div>

                    {/* Walk-in: show today's hours */}
                    {isWalkIn && (() => {
                      const today = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
                      const todayHours = config.opening_hours?.[today];
                      return todayHours ? (
                        <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, marginBottom: 10 }}>
                          Today: {todayHours.split('-').map(formatTime12).join(' – ')}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--error)', fontWeight: 600, marginBottom: 10 }}>Closed today</div>
                      );
                    })()}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {!isWalkIn && f.is_active && (
                        <button onClick={() => { setActiveFacility(f); setSelectedDate(''); setSelectedSlot(null); setBookingSuccess(''); setBookingError(''); }} className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: 11, flex: 1 }}>
                          Book Now
                        </button>
                      )}
                      {isWalkIn && <div style={{ flex: 1 }} />}
                      {!f.is_active && <span style={{ fontSize: 10, color: 'var(--error)', fontWeight: 600, flex: 1 }}>Disabled</span>}
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => openFacilityEdit(f)} style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
                          <button onClick={() => handleFacilityToggle(f)} style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: f.is_active ? 'var(--warning)' : 'var(--primary)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={f.is_active ? 'Disable' : 'Enable'}>{f.is_active ? '⏸' : '▶️'}</button>
                          <button onClick={() => handleFacilityDelete(f)} style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑</button>
                        </div>
                      )}
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

  // ════════════════════════════════════════════════════════
  // LEVEL 1: Facility Types Grid
  // ════════════════════════════════════════════════════════
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--text)', marginBottom: 6 }}>Facilities</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
            Book and access shared facilities in {activeMembership?.community?.name}
          </p>
        </div>
        {isAdmin && (
          <button onClick={openTypeCreate} className="btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: 12 }}>+ New Type</button>
        )}
      </div>

      {/* Type form modal */}
      {showTypeForm && (
        <>
          <div onClick={() => { setShowTypeForm(false); setEditingType(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow)', zIndex: 61 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--text)' }}>{editingType ? 'Edit Type' : 'New Facility Type'}</h3>
              <button onClick={() => { setShowTypeForm(false); setEditingType(null); }} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <form onSubmit={handleTypeSubmit} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {typeError && <div style={{ background: 'var(--error-bg)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--error)' }}>{typeError}</div>}
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Name <span style={{ color: 'var(--error)' }}>*</span></label>
                <input type="text" value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="e.g. Gym, Pool, Party Hall" required autoFocus />
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Icon</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {EMOJI_OPTIONS.map((e) => (
                    <button key={e} type="button" onClick={() => setTypeIcon(e)} style={{
                      width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                      border: typeIcon === e ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: typeIcon === e ? 'var(--primary-glow)' : 'var(--surface-alt)',
                      cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{e}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Cover Image URL</label>
                <input type="url" value={typeImageUrl} onChange={(e) => setTypeImageUrl(e.target.value)} placeholder="https://..." />
                {typeImageUrl && (
                  <div style={{ marginTop: 8, borderRadius: 'var(--radius-sm)', overflow: 'hidden', maxHeight: 100 }}>
                    <img src={typeImageUrl} alt="Preview" style={{ width: '100%', objectFit: 'cover', maxHeight: 100 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Description</label>
                <input type="text" value={typeDescription} onChange={(e) => setTypeDescription(e.target.value)} placeholder="Short description..." />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => { setShowTypeForm(false); setEditingType(null); }} className="btn-secondary" style={{ fontSize: 13 }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={typeSubmitting} style={{ fontSize: 13 }}>
                  {typeSubmitting ? 'Saving...' : editingType ? 'Save Changes' : 'Create Type'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Types grid */}
      {types.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏊</div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>No facilities set up yet.</p>
          {isAdmin && (
            <button onClick={openTypeCreate} className="btn-primary" style={{ width: 'auto', padding: '10px 22px', fontSize: 13 }}>+ Create First Facility Type</button>
          )}
        </div>
      ) : (
        <div className="facility-types-grid">
          {types.map((t) => {
            const count = getFacilitiesByType(t.id).length;
            const hasItems = count > 0;

            return (
              <div key={t.id} onClick={() => { if (hasItems || isAdmin) setActiveType(t); }} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                cursor: hasItems || isAdmin ? 'pointer' : 'default',
                opacity: hasItems || isAdmin ? 1 : 0.5,
                transition: 'border-color 0.15s ease',
              }}>
                {t.image_url ? (
                  <div style={{ height: 140, overflow: 'hidden', position: 'relative' }}>
                    <img src={t.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
                      <span style={{ fontSize: 28, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }}>{t.icon}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-alt)' }}>
                    <span style={{ fontSize: 40 }}>{t.icon}</span>
                  </div>
                )}
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{t.name}</div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-faint)' }}>{count} {count === 1 ? 'facility' : 'facilities'}</span>
                  </div>
                  {t.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t.description}</p>}
                  {!hasItems && !isAdmin && <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6 }}>Coming soon</p>}

                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openTypeEdit(t)} style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
                      <button onClick={() => handleTypeDelete(t)} style={{ width: 26, height: 26, borderRadius: 'var(--radius-sm)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', background: 'transparent', color: 'var(--error)', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑</button>
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