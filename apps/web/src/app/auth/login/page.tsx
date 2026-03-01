'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase-browser';
import { NaboraLogo } from '../../../components/NaboraLogo';
import { ThemeToggle } from '../../../components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setMagicLinkSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-grid-pattern" />

      {/* Theme toggle */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 50 }}>
        <ThemeToggle />
      </div>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Logo */}
        <div
          className="animate-fade-in"
          style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}
        >
          <NaboraLogo size={48} />
        </div>

        {/* Card */}
        <div className="auth-card animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
          {/* Header */}
          <div className="auth-card-header">
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 22,
                color: 'var(--text)',
                marginBottom: 6,
              }}
            >
              Welcome back
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 14,
                color: 'var(--text-muted)',
              }}
            >
              Sign in to your community
            </p>
          </div>

          {/* Body */}
          <div className="auth-card-body">
            {magicLinkSent ? (
              /* Magic link success state */
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
                  ✉️
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 18,
                    color: 'var(--text)',
                    marginBottom: 8,
                  }}
                >
                  Check your email
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    color: 'var(--text-muted)',
                    lineHeight: 1.6,
                    marginBottom: 20,
                  }}
                >
                  We sent a magic link to{' '}
                  <strong style={{ color: 'var(--text)' }}>{email}</strong>.
                  <br />
                  Click the link in the email to sign in.
                </p>
                <button
                  onClick={() => setMagicLinkSent(false)}
                  className="btn-secondary"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              /* Login form */
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Error message */}
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

                {/* Email */}
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

                {/* Password */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 7,
                    }}
                  >
                    <label
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Password
                    </label>
                    <Link
                      href="/auth/forgot-password"
                      style={{ fontSize: 12, fontWeight: 500 }}
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                </div>

                {/* Sign in button */}
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ marginTop: 4 }}
                >
                  {loading ? (
                    <span className="animate-spin" style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                  ) : (
                    'Sign in'
                  )}
                </button>

                {/* Divider */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    margin: '4px 0',
                  }}
                >
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 11,
                      color: 'var(--text-faint)',
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    or
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>

                {/* Magic link */}
                <button
                  type="button"
                  onClick={handleMagicLink}
                  className="btn-secondary"
                  disabled={loading}
                >
                  ✨ Sign in with magic link
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Register link */}
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
          New here?{' '}
          <Link href="/auth/register">Join your community</Link>
        </p>
        <p className="animate-fade-in" style={{
          textAlign: 'center', fontFamily: 'var(--font-body)',
          fontSize: 12, color: 'var(--text-faint)', marginTop: 12,
          animationDelay: '0.3s', opacity: 0,
        }}>
          <Link href="/" style={{ fontWeight: 500, color: 'var(--text-faint)' }}>
            Learn more about Nabora →
          </Link>
        </p>
      </div>
    </div>
  );
}
