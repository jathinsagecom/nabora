'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { createClient } from '../../../lib/supabase-browser';

interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  image_url: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string;
  max_attendees: number | null;
  is_published: boolean;
  created_by: string;
  created_at: string;
  creator: { id: string; full_name: string } | null;
  rsvps: { id: string; status: string; user_id: string; user: { full_name: string } | null }[];
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];
  for (let i = startDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, month: month - 1, year: month === 0 ? year - 1 : year, isCurrentMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, month, year, isCurrentMonth: true });
  }
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ day: i, month: month + 1, year: month === 11 ? year + 1 : year, isCurrentMonth: false });
  }
  return cells;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDuration(start: string, end: string | null) {
  if (!end) return formatTime(start);
  return `${formatTime(start)} — ${formatTime(end)}`;
}

export default function EventsPage() {
  const { activeMembership, isAdmin, user } = useAuth();
  const supabase = createClient();
  const communityId = activeMembership?.community_id;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');

  // Calendar state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  // Event detail
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Create event
  const [showCreate, setShowCreate] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formMaxAttendees, setFormMaxAttendees] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchEvents = useCallback(async () => {
    if (!communityId) return;
    const { data } = await supabase
      .from('events')
      .select('*, creator:users!events_created_by_fkey(id, full_name), rsvps:event_rsvps(id, status, user_id, user:users!event_rsvps_user_id_fkey(full_name))')
      .eq('community_id', communityId)
      .eq('is_published', true)
      .order('starts_at', { ascending: true });
    if (data) setEvents(data);
    setLoading(false);
  }, [communityId]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Calendar helpers
  const cells = getMonthDays(calYear, calMonth);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const getEventsForDay = (day: number, month: number, year: number) => {
    return events.filter((e) => {
      const d = new Date(e.starts_at);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  const goToToday = () => { setCalYear(now.getFullYear()); setCalMonth(now.getMonth()); };

  // Upcoming events for list view
  const upcomingEvents = events.filter((e) => new Date(e.starts_at) >= new Date());
  const pastEvents = events.filter((e) => new Date(e.starts_at) < new Date());

  // RSVP
  const handleRsvp = async (eventId: string, status: string) => {
    const event = events.find((e) => e.id === eventId);
    const existing = event?.rsvps.find((r) => r.user_id === user?.id);
    if (existing) {
      if (existing.status === status) await supabase.from('event_rsvps').delete().eq('id', existing.id);
      else await supabase.from('event_rsvps').update({ status }).eq('id', existing.id);
    } else {
      await supabase.from('event_rsvps').insert({ event_id: eventId, user_id: user?.id, status });
    }
    fetchEvents();
    if (selectedEvent?.id === eventId) {
      const { data } = await supabase
        .from('events')
        .select('*, creator:users!events_created_by_fkey(id, full_name), rsvps:event_rsvps(id, status, user_id, user:users!event_rsvps_user_id_fkey(full_name))')
        .eq('id', eventId).single();
      if (data) setSelectedEvent(data);
    }
  };

  // Create event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    const startsAt = new Date(`${formDate}T${formStartTime}`).toISOString();
    const endsAt = formEndTime ? new Date(`${formDate}T${formEndTime}`).toISOString() : null;

    const { error } = await supabase.from('events').insert({
      community_id: communityId,
      created_by: user?.id,
      title: formTitle.trim(),
      description: formDescription.trim() || null,
      location: formLocation.trim() || null,
      starts_at: startsAt,
      ends_at: endsAt,
      max_attendees: formMaxAttendees ? parseInt(formMaxAttendees) : null,
      is_published: true,
      status: 'upcoming',
    });

    if (error) { setFormError(error.message); setFormSubmitting(false); return; }
    resetCreateForm();
    fetchEvents();
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Delete this event?')) return;
    await supabase.from('events').delete().eq('id', eventId);
    setSelectedEvent(null);
    fetchEvents();
  };

  const resetCreateForm = () => {
    setShowCreate(false); setFormTitle(''); setFormDescription('');
    setFormLocation(''); setFormDate(''); setFormStartTime('');
    setFormEndTime(''); setFormMaxAttendees(''); setFormError('');
    setFormSubmitting(false);
  };

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
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--text)', marginBottom: 6 }}>Events</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
            {upcomingEvents.length} upcoming · {activeMembership?.community?.name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--surface-alt)', borderRadius: 'var(--radius-full)', padding: 3, border: '1px solid var(--border)' }}>
            {(['calendar', 'list'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '5px 14px', borderRadius: 'var(--radius-full)', border: 'none',
                background: view === v ? 'var(--primary)' : 'transparent',
                color: view === v ? 'white' : 'var(--text-muted)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}>{v === 'calendar' ? '📅 Calendar' : '📋 List'}</button>
            ))}
          </div>
          {isAdmin && (
            <button onClick={() => setShowCreate(true)} className="btn-primary" style={{ width: 'auto', padding: '8px 18px', fontSize: 12 }}>
              + New Event
            </button>
          )}
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreate && (
        <>
          <div onClick={resetCreateForm} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow)', zIndex: 61 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--text)' }}>Create Event</h3>
              <button onClick={resetCreateForm} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <form onSubmit={handleCreateEvent} style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {formError && <div style={{ background: 'var(--error-bg)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--error)' }}>{formError}</div>}

              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
                  Event Title <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Summer BBQ" required autoFocus />
              </div>

              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Description</label>
                <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="What's the event about?" rows={3} style={{ resize: 'vertical', minHeight: 70 }} />
              </div>

              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Location</label>
                <input type="text" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} placeholder="e.g. Communal Garden" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
                    Date <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required />
                </div>
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
                    Start <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} required />
                </div>
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>End</label>
                  <input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
                  Max Attendees <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input type="number" min="1" value={formMaxAttendees} onChange={(e) => setFormMaxAttendees(e.target.value)} placeholder="Unlimited" style={{ width: 140 }} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={resetCreateForm} className="btn-secondary" style={{ fontSize: 13 }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={formSubmitting} style={{ fontSize: 13 }}>
                  {formSubmitting ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <>
          <div onClick={() => setSelectedEvent(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--card-shadow)', zIndex: 61 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 17, color: 'var(--text)' }}>Event Details</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setSelectedEvent(null)} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            </div>
            <div style={{ padding: '20px 24px 24px' }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 14, lineHeight: 1.3 }}>{selectedEvent.title}</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>📅</span>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{formatFullDate(selectedEvent.starts_at)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>🕐</span>
                  <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{formatDuration(selectedEvent.starts_at, selectedEvent.ends_at)}</span>
                </div>
                {selectedEvent.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>📍</span>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{selectedEvent.location}</span>
                  </div>
                )}
                {selectedEvent.creator && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>👤</span>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Organised by {selectedEvent.creator.full_name}</span>
                  </div>
                )}
              </div>

              {selectedEvent.description && (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 20 }}>
                  {selectedEvent.description}
                </p>
              )}

              {/* RSVP buttons */}
              {(() => {
                const userRsvp = selectedEvent.rsvps.find((r) => r.user_id === user?.id);
                return (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Your Response</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { status: 'going', label: '✓ Going', color: 'var(--primary)' },
                        { status: 'maybe', label: '? Maybe', color: 'var(--warning)' },
                        { status: 'not_going', label: '✗ Not Going', color: 'var(--error)' },
                      ].map((opt) => (
                        <button key={opt.status} onClick={() => handleRsvp(selectedEvent.id, opt.status)} style={{
                          flex: 1, padding: '10px 12px', borderRadius: 'var(--radius-md)',
                          border: userRsvp?.status === opt.status ? `2px solid ${opt.color}` : '1px solid var(--border)',
                          background: userRsvp?.status === opt.status ? `color-mix(in srgb, ${opt.color} 12%, transparent)` : 'var(--surface-alt)',
                          color: userRsvp?.status === opt.status ? opt.color : 'var(--text-muted)',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)',
                        }}>{opt.label}</button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Going count */}
              {(() => {
                const goingCount = selectedEvent.rsvps.filter((r) => r.status === 'going').length;
                return goingCount > 0 ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 16px', borderRadius: 'var(--radius-md)',
                    background: 'var(--primary-glow)', border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)',
                  }}>
                    <span style={{ fontSize: 16 }}>👥</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
                      {goingCount} {goingCount === 1 ? 'person' : 'people'} going
                    </span>
                    {selectedEvent.max_attendees && (
                      <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 'auto' }}>
                        of {selectedEvent.max_attendees} max
                      </span>
                    )}
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </>
      )}

      {/* CALENDAR VIEW */}
      {view === 'calendar' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {/* Month navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, color: 'var(--text)' }}>
                {MONTHS[calMonth]} {calYear}
              </h3>
              <button onClick={goToToday} style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-faint)', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Today</button>
            </div>
            <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {DAYS.map((d) => (
              <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', borderBottom: '1px solid var(--border)' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((cell, i) => {
              const dayEvents = getEventsForDay(cell.day, cell.month, cell.year);
              const isToday = cell.day === today.getDate() && cell.month === today.getMonth() && cell.year === today.getFullYear();
              return (
                <div key={i} style={{
                  minHeight: 'clamp(50px, 10vw, 90px)',
                  padding: '4px 6px',
                  borderBottom: '1px solid var(--border)',
                  borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
                  background: isToday ? 'var(--primary-glow)' : !cell.isCurrentMonth ? 'var(--surface-alt)' : 'transparent',
                  opacity: cell.isCurrentMonth ? 1 : 0.4,
                }}>
                  <div style={{
                    fontFamily: 'var(--font-heading)', fontSize: 12, fontWeight: isToday ? 700 : 500,
                    color: isToday ? 'var(--primary)' : 'var(--text-muted)',
                    marginBottom: 2,
                  }}>{cell.day}</div>
                  {dayEvents.slice(0, 2).map((ev) => (
                    <button key={ev.id} onClick={() => setSelectedEvent(ev)} style={{
                      display: 'block', width: '100%', padding: '2px 4px', marginBottom: 2,
                      borderRadius: 3, border: 'none', textAlign: 'left',
                      background: 'var(--primary)', color: 'white',
                      fontSize: 9, fontWeight: 600, cursor: 'pointer',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      fontFamily: 'var(--font-body)',
                    }}>{ev.title}</button>
                  ))}
                  {dayEvents.length > 2 && (
                    <div style={{ fontSize: 9, color: 'var(--text-faint)', paddingLeft: 4 }}>+{dayEvents.length - 2} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {view === 'list' && (
        <div>
          {upcomingEvents.length === 0 && pastEvents.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No events yet.</p>
            </div>
          ) : (
            <>
              {upcomingEvents.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, paddingLeft: 4 }}>Upcoming ({upcomingEvents.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {upcomingEvents.map((event) => {
                      const d = new Date(event.starts_at);
                      const goingCount = event.rsvps.filter((r) => r.status === 'going').length;
                      const userRsvp = event.rsvps.find((r) => r.user_id === user?.id);
                      return (
                        <div key={event.id} onClick={() => setSelectedEvent(event)} style={{
                          background: 'var(--surface)', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)', padding: '16px 18px',
                          cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'center',
                          transition: 'border-color 0.15s ease',
                        }}>
                          <div style={{ width: 52, height: 56, borderRadius: 'var(--radius-sm)', background: 'var(--primary-glow)', border: '1px solid color-mix(in srgb, var(--primary) 25%, var(--border))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>{d.getDate()}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--primary)', letterSpacing: 0.5 }}>{d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{event.title}</div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-faint)' }}>
                              <span>🕐 {formatTime(event.starts_at)}</span>
                              {event.location && <span>📍 {event.location}</span>}
                              <span>👥 {goingCount} going</span>
                            </div>
                          </div>
                          {userRsvp && (
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 'var(--radius-full)',
                              background: userRsvp.status === 'going' ? 'var(--primary-glow)' : userRsvp.status === 'maybe' ? 'color-mix(in srgb, var(--warning) 15%, transparent)' : 'var(--error-bg)',
                              color: userRsvp.status === 'going' ? 'var(--primary)' : userRsvp.status === 'maybe' ? 'var(--warning)' : 'var(--error)',
                              flexShrink: 0,
                            }}>
                              {userRsvp.status === 'going' ? 'Going' : userRsvp.status === 'maybe' ? 'Maybe' : 'Not Going'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {pastEvents.length > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, paddingLeft: 4 }}>Past ({pastEvents.length})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pastEvents.map((event) => {
                      const d = new Date(event.starts_at);
                      return (
                        <div key={event.id} onClick={() => setSelectedEvent(event)} style={{
                          background: 'var(--surface)', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)', padding: '12px 16px',
                          cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'center', opacity: 0.6,
                        }}>
                          <div style={{ width: 40, height: 44, borderRadius: 'var(--radius-sm)', background: 'var(--surface-alt)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--text-muted)', lineHeight: 1 }}>{d.getDate()}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-faint)' }}>{d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{event.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{event.rsvps.filter((r) => r.status === 'going').length} attended</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}