'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { createClient } from '../../../lib/supabase-browser';

export default function ProfilePage() {
  const { profile, user, memberships, residencies, refresh } = useAuth();
  const supabase = createClient();

  // Profile form
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormName(profile.full_name || '');
      setFormPhone(profile.phone || '');
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess(false);

    const { error } = await supabase
      .from('users')
      .update({
        full_name: formName.trim(),
        phone: formPhone.trim() || null,
      })
      .eq('id', user?.id);

    if (error) {
      setProfileError(error.message);
      setProfileSaving(false);
      return;
    }

    setProfileSaving(false);
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 3000);
    refresh();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordError('');
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      setPasswordSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      setPasswordSaving(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordError(error.message);
      setPasswordSaving(false);
      return;
    }

    setPasswordSaving(false);
    setPasswordSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordForm(false);
    setTimeout(() => setPasswordSuccess(false), 3000);
  };

  // Group residencies by community
  const communitySummaries = memberships.map((m: any) => {
    const community = m.community;
    const userResidencies = residencies.filter(
      (r: any) => r.is_current && r.unit?.community_id === m.community_id
    );
    return { membership: m, community, residencies: userResidencies };
  });

  if (!profile) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--text)', marginBottom: 6 }}>Profile Settings</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>Manage your personal information</p>
      </div>

      <div className="profile-layout">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Avatar + basic info card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              border: '3px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 700, color: 'white',
              fontFamily: 'var(--font-heading)', flexShrink: 0,
            }}>
              {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                {profile.full_name}
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                {profile.email}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {profile.is_super_admin && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>⚡ Super Admin</span>
                )}
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--text-faint)' }}>
                  Joined {new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Edit profile form */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15, color: 'var(--text)' }}>Personal Information</h3>
              {profileSuccess && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>✓ Saved</span>}
            </div>
            <form onSubmit={handleSaveProfile} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {profileError && <div style={{ background: 'var(--error-bg)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--error)' }}>{profileError}</div>}

              {/* Email (read only) */}
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
                  Email <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(cannot be changed)</span>
                </label>
                <input type="email" value={profile.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
              </div>

              {/* Name */}
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
                  Full Name <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Your full name" required />
              </div>

              {/* Phone */}
              <div>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
                  Phone Number <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="07700 123456" />
              </div>

              <button type="submit" className="btn-primary" disabled={profileSaving} style={{ width: 'auto', alignSelf: 'flex-start', padding: '10px 28px', fontSize: 13 }}>
                {profileSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Password section */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 15, color: 'var(--text)' }}>Password</h3>
              {passwordSuccess && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>✓ Updated</span>}
            </div>
            <div style={{ padding: 20 }}>
              {!showPasswordForm ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text-muted)' }}>
                    ••••••••
                  </p>
                  <button onClick={() => setShowPasswordForm(true)} style={{
                    padding: '8px 16px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}>
                    Change Password
                  </button>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {passwordError && <div style={{ background: 'var(--error-bg)', border: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--error)' }}>{passwordError}</div>}

                  <div>
                    <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
                      New Password <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} />
                  </div>

                  <div>
                    <label style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 7 }}>
                      Confirm Password <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" required minLength={6} />
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" onClick={() => { setShowPasswordForm(false); setPasswordError(''); setNewPassword(''); setConfirmPassword(''); }} style={{
                      padding: '8px 16px', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)', background: 'transparent',
                      color: 'var(--text-muted)', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'var(--font-body)',
                    }}>Cancel</button>
                    <button type="submit" className="btn-primary" disabled={passwordSaving} style={{ width: 'auto', padding: '8px 20px', fontSize: 12 }}>
                      {passwordSaving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Communities & Units */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--text)' }}>
                Your Communities
              </h3>
            </div>
            <div style={{ padding: '8px 12px' }}>
              {communitySummaries.map((cs: any) => (
                <div key={cs.membership.id} style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                      background: 'linear-gradient(135deg, var(--primary-muted), var(--accent-muted))',
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: 'var(--primary)',
                      fontFamily: 'var(--font-heading)', flexShrink: 0,
                    }}>
                      {cs.community?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        {cs.community?.name}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                        {cs.membership.role === 'community_admin' ? 'Admin' : 'Resident'}
                        {cs.membership.is_default && ' · Default'}
                      </div>
                    </div>
                  </div>

                  {/* Units in this community */}
                  {cs.residencies.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginLeft: 40 }}>
                      {cs.residencies.map((r: any) => {
                        const typeIcon = r.unit?.unit_type === 'parking' ? '🅿️' :
                          r.unit?.unit_type === 'storage' ? '📦' : '🏠';
                        return (
                          <span key={r.id} style={{
                            fontSize: 11, padding: '3px 10px', borderRadius: 'var(--radius-full)',
                            background: 'var(--surface-alt)', border: '1px solid var(--border)',
                            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3,
                          }}>
                            {typeIcon} {r.unit?.unit_number}
                            <span style={{ color: 'var(--text-faint)', fontSize: 9 }}>
                              · {r.resident_type?.replace(/_/g, ' ')}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ marginLeft: 40, fontSize: 11, color: 'var(--text-faint)', fontStyle: 'italic' }}>
                      No units assigned
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Account info */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 14, color: 'var(--text)' }}>Account</h3>
            </div>
            <div style={{ padding: '12px 20px' }}>
              {[
                { label: 'User ID', value: user?.id || '—' },
                { label: 'Status', value: profile.is_active ? 'Active' : 'Inactive' },
                { label: 'Communities', value: String(memberships.length) },
                { label: 'Last Sign In', value: user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' },
                { label: 'Created', value: profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
              ].map((item) => (
                <div key={item.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.value}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}