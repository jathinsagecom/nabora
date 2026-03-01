'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../lib/supabase-browser';
import { NaboraLogo } from '../../../components/NaboraLogo';
import { ThemeToggle } from '../../../components/ThemeToggle';

interface InviteDetails {
  email: string;
  unit_number: string | null;
  unit_id: string | null;
  community_name: string;
  community_slug: string;
  community_id: string;
  role: string;
  resident_type: string;
  is_valid: boolean;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} /></div>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const token = searchParams.get('token');

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [inviteLoading, setInviteLoading] = useState(!!token);
  const [inviteError, setInviteError] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch invite details when token is present
  useEffect(() => {
    if (!token) { setInviteLoading(false); return; }
    const fetchInvite = async () => {
      const { data, error } = await supabase.rpc('get_invite_details', { invite_token: token });
      if (error || !data || data.length === 0) {
        setInviteError('This invite link is invalid or has expired. Please contact your building manager for a new one.');
      } else {
        const inviteData = data[0];
        setInvite(inviteData);
        setEmail(inviteData.email);
      }
      setInviteLoading(false);
    };
    fetchInvite();
  }, [token]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Step 1: Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: fullName },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (authData.user && token && invite) {
      // Step 2: Accept the invite (marks it as used)
      const { data: acceptedInvite, error: acceptError } = await supabase.rpc('accept_invite', {
        invite_token: token,
        accepting_user_id: authData.user.id,
      });

      if (acceptError) {
        console.error('Accept invite error:', acceptError);
        setError('Account created but there was an issue with your invite. Please contact your building manager.');
        setLoading(false);
        return;
      }

      const inviteData = acceptedInvite[0];

      // Step 3: Create user profile (basic identity)
      const { error: profileError } = await supabase.from('users').insert({
        id: authData.user.id,
        email: email,
        full_name: fullName,
        is_super_admin: false,
        is_active: true,
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        setError('Account created but profile setup failed. Please contact support.');
        setLoading(false);
        return;
      }

      // Step 4: Create community membership (links user to community with role)
      const { error: membershipError } = await supabase.from('user_communities').insert({
        user_id: authData.user.id,
        community_id: inviteData.community_id,
        role: inviteData.role || 'resident',
        is_default: true,
      });

      if (membershipError) {
        console.error('Membership creation error:', membershipError);
        // Don't block — user and profile exist, admin can fix membership
      }

      // Step 5: Create residency (links user to their unit)
      if (inviteData.unit_id) {
        const { error: residencyError } = await supabase.from('residencies').insert({
          unit_id: inviteData.unit_id,
          user_id: authData.user.id,
          resident_type: inviteData.resident_type || 'tenant',
          starts_at: new Date().toISOString().split('T')[0],
        });

        if (residencyError) {
          console.error('Residency creation error:', residencyError);
          // Don't block — can be assigned later by admin
        }
      }
    }

    // Check if session exists (email confirmation disabled)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.push('/dashboard');
      router.refresh();
      return;
    }

    // Email confirmation enabled — show check email message
    setSuccess(true);
    setLoading(false);
  };

  // Loading state while fetching invite
  if (inviteLoading) {
    return (
      <div className="auth-page">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)' }}>Verifying your invite...</p>
        </div>
      </div>
    );
  }

  // No token — show invite required message
  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-grid-pattern" />
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 50 }}><ThemeToggle /></div>
        <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
          <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}><NaboraLogo size={48} /></div>
          <div className="auth-card animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
            <div className="auth-card-body" style={{ textAlign: 'center', padding: '40px 32px' }}>
              <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-lg)', background: 'var(--primary-glow)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, fontSize: 28 }}>🔑</div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--text)', marginBottom: 10 }}>Invite required</h2>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>Nabora is invite-only. Ask your building manager or community admin for an invite link to join your community.</p>
              <Link href="/auth/login" style={{ textDecoration: 'none' }}><button className="btn-secondary">Already have an account? Sign in</button></Link>
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
        </div>
      </div>
    );
  }

  // Invalid or expired token
  if (inviteError) {
    return (
      <div className="auth-page">
        <div className="auth-grid-pattern" />
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 50 }}><ThemeToggle /></div>
        <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
          <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}><NaboraLogo size={48} /></div>
          <div className="auth-card animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
            <div className="auth-card-body" style={{ textAlign: 'center', padding: '40px 32px' }}>
              <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-lg)', background: 'var(--error-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, fontSize: 28 }}>⚠️</div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--text)', marginBottom: 10 }}>Invalid invite</h2>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>{inviteError}</p>
              <Link href="/auth/login" style={{ textDecoration: 'none' }}><button className="btn-secondary">Go to sign in</button></Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Valid invite — registration form
  return (
    <div className="auth-page">
      <div className="auth-grid-pattern" />
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 50 }}><ThemeToggle /></div>
      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}><NaboraLogo size={48} /></div>
        <div className="auth-card animate-fade-in" style={{ animationDelay: '0.1s', opacity: 0 }}>
          <div className="auth-card-header">
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, color: 'var(--text)', marginBottom: 6 }}>Join your community</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)' }}>
              You&apos;ve been invited to <strong style={{ color: 'var(--primary)' }}>{invite?.community_name}</strong>
            </p>
          </div>
          <div className="auth-card-body">
            {success ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-lg)', background: 'var(--primary-glow)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, fontSize: 28 }}>🎉</div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>Check your email</h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>
                  We sent a confirmation link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.<br />Click the link to activate your account.
                </p>
                <Link href="/auth/login" style={{ textDecoration: 'none' }}><button className="btn-secondary">Back to sign in</button></Link>
              </div>
            ) : (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {error && (
                  <div style={{ background: 'var(--error-bg)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--error)' }}>{error}</div>
                )}

                {/* Community — readonly */}
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Community</label>
                  <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🏠</span>
                    {invite?.community_name}
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-faint)', background: 'var(--border)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>Invited</span>
                  </div>
                </div>

                {/* Unit — readonly */}
                {invite?.unit_number && (
                  <div>
                    <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Unit / Flat</label>
                    <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{invite.unit_number}</span>
                      {invite.resident_type && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 'var(--radius-full)', background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>
                          {invite.resident_type.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Email — readonly */}
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Email address</label>
                  <input type="email" value={email} readOnly style={{ background: 'var(--surface-alt)', cursor: 'not-allowed', color: 'var(--text-muted)' }} />
                </div>

                {/* Full name — editable */}
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Full name</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" required autoComplete="name" autoFocus />
                </div>

                {/* Password — editable */}
                <div>
                  <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" required minLength={8} autoComplete="new-password" />
                </div>

                <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4 }}>
                  {loading ? <span className="animate-spin" style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} /> : 'Create account'}
                </button>

                <p style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.6 }}>
                  By creating an account, you agree to our <span style={{ color: 'var(--primary)', cursor: 'pointer' }}>Terms</span> and <span style={{ color: 'var(--primary)', cursor: 'pointer' }}>Privacy Policy</span>
                </p>
              </form>
            )}
          </div>
        </div>
        <p className="animate-fade-in" style={{ textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-muted)', marginTop: 24, animationDelay: '0.2s', opacity: 0 }}>
          Already have an account? <Link href="/auth/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}