'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase-browser';
import { NaboraLogo } from '../../../components/NaboraLogo';
import { ThemeToggle } from '../../../components/ThemeToggle';

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-grid-pattern" />

      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 50 }}>
        <ThemeToggle />
      </div>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        <div
          className="animate-fade-in"
          style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}
        >
          <NaboraLogo size={48} />
        </div>

        <div className="auth-card animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
          <div className="auth-card-header">
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 22,
                color: 'var(--text)',
                marginBottom: 6,
              }}
            >
              Reset password
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--text-muted)',
              }}
            >
              {sent
                ? 'Check your email for the reset link'
                : "Enter your email and we'll send you a reset link"}
            </p>
          </div>

          <div className="auth-card-body">
            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--primary-glow)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 18,
                    fontSize: 28,
                  }}
                >
                  📧
                </div>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                    marginBottom: 20,
                  }}
                >
                  We sent a reset link to{' '}
                  <strong style={{ color: 'var(--text)' }}>{email}</strong>.
                  <br />
                  Click the link to set a new password.
                </p>
                <Link href="/auth/login" style={{ textDecoration: 'none' }}>
                  <button className="btn-secondary">Back to sign in</button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {error && (
                  <div
                    style={{
                      background: 'var(--error-bg)',
                      border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      color: 'var(--error)',
                    }}
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      display: 'block',
                      marginBottom: 7,
                    }}
                  >
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="animate-spin" style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        <p
          className="animate-fade-in"
          style={{
            textAlign: 'center',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--text-muted)',
            marginTop: 24,
            animationDelay: '0.2s',
            opacity: 0,
          }}
        >
          Remember your password?{' '}
          <Link href="/auth/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
