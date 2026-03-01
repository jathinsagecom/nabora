'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NaboraLogo } from '../components/NaboraLogo';
import { createClient } from '../lib/supabase-browser';

export default function LandingPage() {
  const supabase = createClient();
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState('');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitting(true);
    setContactError('');

    const { error } = await supabase.from('contact_inquiries').insert({
      full_name: contactName.trim(),
      email: contactEmail.trim().toLowerCase(),
      phone: contactPhone.trim() || null,
    });

    if (error) {
      // 23505 is Postgres's unique violation code, which we use to prevent duplicate inquiries from the same email
      if (error.code === '23505') {
        setContactError('We already have your details. We\'ll be in touch soon!');
      } else {
        setContactError('Something went wrong. Please try again.');
      }
      setContactSubmitting(false);
      return;
    }

    setContactSuccess(true);
    setContactSubmitting(false);
  };

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px',
        background: 'rgba(8, 12, 21, 0.8)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(30, 41, 59, 0.5)',
      }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <NaboraLogo size={32} />
        </Link>
        <div className="nav-buttons" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a href="#contact" style={{
            padding: '9px 22px', borderRadius: 'var(--radius-full)',
            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
            textDecoration: 'none', border: '1px solid rgba(16, 185, 129, 0.3)',
            background: 'rgba(16, 185, 129, 0.08)', color: 'var(--primary)',
            transition: 'all 0.2s ease',
          }}>
            Get in touch
          </a>
          <Link href="/auth/login" style={{
            padding: '9px 22px', borderRadius: 'var(--radius-full)',
            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
            textDecoration: 'none', border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-secondary)',
            transition: 'all 0.2s ease',
          }}>
            Sign in →
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        position: 'relative', minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '120px 24px 80px', overflow: 'hidden',
      }}>
        {/* Background effects */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 30% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(139, 92, 246, 0.06) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.03) 0%, transparent 70%)',
        }} />
        <div className="auth-grid-pattern" />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 720 }}>
          <div className="animate-fade-in" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px 6px 8px', borderRadius: 'var(--radius-full)',
            background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--primary)',
            marginBottom: 28,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)',
              animation: 'glow 2s ease-in-out infinite',
            }} />
            Community management, reimagined
          </div>

          <h1 className="animate-fade-in" style={{
            fontFamily: 'var(--font-heading)', fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em',
            marginBottom: 20, animationDelay: '0.1s', opacity: 0,
          }}>
            Your building,<br />
            <span style={{
              background: 'linear-gradient(135deg, var(--primary), #34D399, var(--accent))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>connected.</span>
          </h1>

          <p className="animate-fade-in" style={{
            fontSize: 'clamp(15px, 2vw, 18px)', color: 'var(--text-muted)',
            lineHeight: 1.7, maxWidth: 520, margin: '0 auto 36px',
            animationDelay: '0.2s', opacity: 0,
          }}>
            Nabora brings everything your residential community needs into one elegant platform — issues, events, bookings, documents, and more.
          </p>

          <a href="#features" className="animate-fade-in" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 32px', borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
            color: 'white', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
            textDecoration: 'none', border: 'none',
            boxShadow: '0 4px 24px rgba(16, 185, 129, 0.3)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            animationDelay: '0.3s', opacity: 0,
          }}>
            See what&apos;s inside ↓
          </a>
        </div>

        {/* Scroll hint */}
        <div className="scroll-hint-el" style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            fontSize: 11, color: 'var(--text-faint)',
            fontFamily: 'var(--font-mono)', letterSpacing: 1, textTransform: 'uppercase',
          }}>Scroll</span>
          <div style={{
            width: 1, height: 40,
            background: 'linear-gradient(to bottom, var(--primary), transparent)',
            animation: 'float 2s ease-in-out infinite',
          }} />
        </div>
      </section>

      {/* ── For Residents ── */}
      <section id="features" style={{ padding: '100px 24px', position: 'relative' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
            color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 2,
            marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ width: 24, height: 1, background: 'var(--primary)', display: 'inline-block' }} />
            For Residents
          </div>
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontSize: 'clamp(26px, 4vw, 40px)',
            fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 16,
          }}>Everything in one place</h2>
          <p style={{
            fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.7,
            maxWidth: 560, marginBottom: 48,
          }}>
            No more WhatsApp chaos, lost notices, or spreadsheet sign-ups. Every resident gets a clean, simple interface.
          </p>

          <div className="tour-features-grid">
            {[
              { icon: '📰', title: 'Feed & Announcements', desc: 'Community updates, notices, and announcements in a clean timeline. Never miss what matters in your building.', color: 'rgba(16, 185, 129, 0.12)' },
              { icon: '🔧', title: 'Issue Reporting', desc: 'Report maintenance issues with photos and descriptions. Track status, filter by priority, and see resolution progress in real time.', color: 'rgba(139, 92, 246, 0.12)' },
              { icon: '📅', title: 'Events & RSVP', desc: 'Browse upcoming community events, RSVP with one tap, and see who\'s attending. From AGMs to summer socials.', color: 'rgba(245, 158, 11, 0.12)' },
              { icon: '🏊', title: 'Facility Booking', desc: 'Book shared spaces — gym, meeting rooms, BBQ area, guest parking. Fully customisable slots and rules per facility.', color: 'rgba(59, 130, 246, 0.12)' },
              { icon: '📁', title: 'Documents & Guides', desc: 'Access building rules, meeting minutes, insurance docs, and how-to guides. Everything organised and always available.', color: 'rgba(244, 63, 94, 0.12)' },
              { icon: '📞', title: 'Contacts & Tips', desc: 'Emergency numbers, management contacts, local recommendations, and building-specific tips — all in one directory.', color: 'rgba(6, 182, 212, 0.12)' },
            ].map((f) => (
              <div key={f.title} className="tour-feature-card" style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '28px 24px',
                position: 'relative', overflow: 'hidden',
                transition: 'all 0.3s ease',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, marginBottom: 16, background: f.color,
                }}>{f.icon}</div>
                <h3 style={{
                  fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700,
                  marginBottom: 8, letterSpacing: '-0.01em',
                }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div style={{
        maxWidth: 1080, margin: '0 auto', height: 1,
        background: 'linear-gradient(90deg, transparent, var(--border-light), transparent)',
      }} />

      {/* ── For Admins ── */}
      <section style={{ padding: '100px 24px', position: 'relative' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
            color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 2,
            marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ width: 24, height: 1, background: 'var(--primary)', display: 'inline-block' }} />
            For Admins
          </div>
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontSize: 'clamp(26px, 4vw, 40px)',
            fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 16,
          }}>Manage with clarity</h2>
          <p style={{
            fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.7,
            maxWidth: 560, marginBottom: 48,
          }}>
            Building managers and committee members get powerful tools without the complexity. Everything you need, nothing you don&apos;t.
          </p>

          <div className="tour-admin-grid">
            {[
              { num: '01', title: 'Unit Management', desc: 'Define your own unit types — flats, parking bays, storage rooms. Custom attributes per type. No rigid templates.' },
              { num: '02', title: 'Resident Overview', desc: 'See every resident, their units, roles, and history. End residencies, reassign units, reactivate past members — all in one view.' },
              { num: '03', title: 'Smart Onboarding', desc: 'Invite by email. New users get a registration link. Existing users are added instantly. No duplicate accounts, no confusion.' },
              { num: '04', title: 'Feature Control', desc: 'Toggle features on or off per community. Only need issues and events? Disable the rest. The app adapts to what you use.' },
            ].map((a) => (
              <div key={a.num} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: 24,
                display: 'flex', gap: 16, alignItems: 'flex-start',
                transition: 'all 0.3s ease',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary-glow)', border: '1px solid rgba(16, 185, 129, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                  color: 'var(--primary)', flexShrink: 0,
                }}>{a.num}</div>
                <div>
                  <h4 style={{
                    fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700,
                    marginBottom: 5,
                  }}>{a.title}</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div style={{
        maxWidth: 1080, margin: '0 auto', height: 1,
        background: 'linear-gradient(90deg, transparent, var(--border-light), transparent)',
      }} />

      {/* ── Platform ── */}
      <section style={{ padding: '100px 24px', position: 'relative' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
            color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 2,
            marginBottom: 12, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            The Platform
          </div>
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontSize: 'clamp(26px, 4vw, 40px)',
            fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 16,
          }}>Built to last, built to scale</h2>
          <p style={{
            fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.7,
            maxWidth: 560, margin: '0 auto 48px',
          }}>
            Nabora isn&apos;t a throwaway tool. It&apos;s a platform designed with real architecture, real data integrity, and real attention to craft.
          </p>

          <div className="tour-platform-grid">
            {[
              { icon: '🏢', title: 'Multi-Community', desc: 'One account, multiple buildings. Property managers switch between communities instantly. Residents see only what\'s theirs.' },
              { icon: '🎨', title: 'Community Theming', desc: 'Each building gets its own visual identity. Custom colour palettes, not just a logo swap. The app feels like yours.' },
              { icon: '🔒', title: 'Role-Based Access', desc: 'Residents see what they need. Admins get management tools. Super admins oversee everything. Clean separation, no leaks.' },
              { icon: '📱', title: 'Every Screen Size', desc: 'Desktop sidebar, mobile bottom bar, responsive everything. Built for how people actually use their devices.' },
              { icon: '🧩', title: 'Endlessly Flexible', desc: 'JSONB-powered attributes, dynamic schemas, configurable unit types. Add fields, change structures — no migration needed.' },
              { icon: '📊', title: 'Data Integrity', desc: 'Resident history is preserved, never deleted. Past tenancies, role changes, unit assignments — everything is traceable.' },
            ].map((p) => (
              <div key={p.title} className="tour-platform-item" style={{ textAlign: 'center', padding: 20 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 'var(--radius-lg)',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 26, margin: '0 auto 14px',
                  transition: 'all 0.3s ease',
                }}>{p.icon}</div>
                <h4 style={{
                  fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, marginBottom: 6,
                }}>{p.title}</h4>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact / CTA ── */}
      <section id="contact" style={{
        padding: '120px 24px',
        background: 'radial-gradient(ellipse at 50% 50%, rgba(16, 185, 129, 0.06) 0%, transparent 60%)',
      }}>
        <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16,
          }}>
            Ready to see it{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--primary), #34D399, var(--accent))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>in action?</span>
          </h2>
          <p style={{
            fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.7,
            maxWidth: 480, margin: '0 auto 40px',
          }}>
            Nabora is invite-only. Drop your details and we&apos;ll get back to you.
          </p>

          {contactSuccess ? (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '40px 32px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>🎉</div>
              <h3 style={{
                fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700,
                marginBottom: 8,
              }}>Thanks, {contactName.split(' ')[0]}!</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                We&apos;ve received your details. We&apos;ll be in touch soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '32px',
              display: 'flex', flexDirection: 'column', gap: 16,
              textAlign: 'left',
            }}>
              {contactError && (
                <div style={{
                  background: 'var(--error-bg)',
                  border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)',
                  borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                  fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--error)',
                }}>{contactError}</div>
              )}

              <div>
                <label style={{
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                  color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                }}>
                  Your name <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="John Smith"
                  required
                  style={{
                    fontFamily: 'var(--font-body)', background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)', borderRadius: 'var(--radius-md)',
                    padding: '12px 14px', fontSize: 14, color: 'var(--text)', width: '100%',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                  color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                }}>
                  Email address <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@email.com"
                  required
                  style={{
                    fontFamily: 'var(--font-body)', background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)', borderRadius: 'var(--radius-md)',
                    padding: '12px 14px', fontSize: 14, color: 'var(--text)', width: '100%',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{
                  fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                  color: 'var(--text-secondary)', display: 'block', marginBottom: 7,
                }}>
                  Phone number <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="07700 123456"
                  style={{
                    fontFamily: 'var(--font-body)', background: 'var(--input-bg)',
                    border: '1px solid var(--input-border)', borderRadius: 'var(--radius-md)',
                    padding: '12px 14px', fontSize: 14, color: 'var(--text)', width: '100%',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={contactSubmitting}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: '14px 28px', borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                  color: 'white', fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 700,
                  border: 'none', cursor: contactSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  opacity: contactSubmitting ? 0.6 : 1, width: '100%', marginTop: 4,
                }}
              >
                {contactSubmitting ? 'Sending...' : 'Get in touch'}
              </button>

              <p style={{
                fontSize: 11, color: 'var(--text-faint)', textAlign: 'center',
                lineHeight: 1.6, marginTop: 4,
              }}>
                We&apos;ll reach out to discuss how Nabora can work for your community.
              </p>
            </form>
          )}

          <div style={{
            display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap',
            marginTop: 32,
          }}>
            <Link href="/auth/login" style={{
              padding: '10px 24px', borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-light)', background: 'transparent',
              color: 'var(--text-secondary)', fontFamily: 'var(--font-body)',
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}>
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        textAlign: 'center', padding: '32px 24px',
        borderTop: '1px solid var(--border)',
      }}>
        <p style={{ fontSize: 12, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
          Nabora · Modern community management
        </p>
      </footer>

      {/* ── Keyframe styles ── */}
      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes glow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

        .tour-features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .tour-admin-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .tour-platform-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }

        .tour-feature-card:hover { border-color: var(--border-light) !important; transform: translateY(-2px); }
        .tour-platform-item:hover > div:first-child { border-color: var(--primary) !important; background: var(--primary-glow) !important; }

        #contact input:focus { border-color: var(--input-focus) !important; box-shadow: 0 0 0 3px var(--primary-glow); }
        #contact input::placeholder { color: var(--text-faint); }

        .scroll-hint-el { animation: fadeIn 1s ease-out 1s both; }

        @media (max-width: 768px) {
          .tour-features-grid { grid-template-columns: 1fr !important; }
          .tour-admin-grid { grid-template-columns: 1fr !important; }
          .tour-platform-grid { grid-template-columns: 1fr !important; }
          .scroll-hint-el { display: none !important; }
          .nav-buttons { gap: 6px !important; }
          .nav-buttons a { padding: 7px 14px !important; font-size: 12px !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .tour-features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .tour-platform-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}