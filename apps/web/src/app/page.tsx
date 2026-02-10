'use client';

import Link from 'next/link';
import { NaboraLogo } from '../components/NaboraLogo';
import { ThemeToggle } from '../components/ThemeToggle';

export default function LandingPage() {
  return (
    <div className="auth-page">
      <div className="auth-grid-pattern" />

      <div style={{ width: '100%', maxWidth: 480, position: 'relative' }}>
        {/* Theme toggle - top right */}
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 50,
          }}
        >
          <ThemeToggle />
        </div>

        {/* Logo and hero */}
        <div
          className="animate-fade-in"
          style={{
            textAlign: 'center',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 28,
            }}
          >
            <NaboraLogo size={52} />
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(28px, 5vw, 40px)',
              fontWeight: 700,
              color: 'var(--text)',
              lineHeight: 1.2,
              marginBottom: 14,
              letterSpacing: '-0.03em',
            }}
          >
            Your community,
            <br />
            <span style={{ color: 'var(--primary)' }}>connected</span>
          </h1>

          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              color: 'var(--text-muted)',
              lineHeight: 1.7,
              maxWidth: 380,
              margin: '0 auto',
            }}
          >
            Events, notices, local services, and everything your neighbourhood
            needs — in one place.
          </p>
        </div>

        {/* CTA buttons */}
        <div
          className="animate-fade-in"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            animationDelay: '0.15s',
            opacity: 0,
          }}
        >
          <Link href="/auth/login" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ fontSize: 15 }}>
              Sign in to your community
            </button>
          </Link>

          <Link href="/auth/register" style={{ textDecoration: 'none' }}>
            <button className="btn-secondary" style={{ fontSize: 15 }}>
              Join your community
            </button>
          </Link>
        </div>

        {/* Footer */}
        <p
          className="animate-fade-in"
          style={{
            textAlign: 'center',
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--text-faint)',
            marginTop: 40,
            lineHeight: 1.6,
            animationDelay: '0.3s',
            opacity: 0,
          }}
        >
          Trusted by communities across the UK
        </p>
      </div>
    </div>
  );
}