'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { getVisibleNavItems, type NavItem } from '../lib/navigation';
import { NaboraLogo } from './NaboraLogo';
import { ThemeToggle } from './ThemeToggle';

export function Sidebar() {
  const pathname = usePathname();
  const {
    profile,
    memberships,
    activeMembership,
    activeCommunity,
    role,
    isSuperAdmin,
    isAdmin,
    features,
    switchCommunity,
    signOut,
  } = useAuth();

  const [switcherOpen, setSwitcherOpen] = useState(false);

  const visibleItems = getVisibleNavItems(role, isSuperAdmin, features);
  const mainItems = visibleItems.filter((i) => i.section === 'main');
  const manageItems = visibleItems.filter((i) => i.section === 'manage');
  const adminItems = visibleItems.filter((i) => i.section === 'admin');

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <aside style={{
      width: 260,
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      zIndex: 40,
      transition: 'background 0.3s ease',
    }}>
      {/* ──── Top: Logo + Community Switcher ──── */}
      <div style={{ padding: '20px 18px 0' }}>
        <div style={{ marginBottom: 20 }}>
          <NaboraLogo size={34} />
        </div>

        {/* Community Switcher */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <button
            onClick={() => memberships.length > 1 && setSwitcherOpen(!switcherOpen)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--surface-alt)',
              cursor: memberships.length > 1 ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
            }}
          >
            {/* Community avatar */}
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              color: 'white',
              fontFamily: 'var(--font-heading)',
              flexShrink: 0,
            }}>
              {activeCommunity?.name?.charAt(0) || 'N'}
            </div>

            <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {activeCommunity?.name || 'No community'}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-faint)',
                marginTop: 1,
              }}>
                {role === 'community_admin' ? 'Admin' : 'Resident'}
                {isSuperAdmin && ' · Super'}
              </div>
            </div>

            {/* Chevron */}
            {memberships.length > 1 && (
              <span style={{
                fontSize: 10,
                color: 'var(--text-faint)',
                transform: switcherOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}>
                ▼
              </span>
            )}
          </button>

          {/* Dropdown */}
          {switcherOpen && (
            <>
              {/* Backdrop */}
              <div
                onClick={() => setSwitcherOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 49,
                }}
              />
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--card-shadow)',
                zIndex: 50,
                padding: 6,
                maxHeight: 240,
                overflowY: 'auto',
              }}>
                {memberships.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      switchCommunity(m);
                      setSwitcherOpen(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: m.id === activeMembership?.id
                        ? 'var(--primary-glow)'
                        : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (m.id !== activeMembership?.id) {
                        (e.target as HTMLElement).style.background = 'var(--surface-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (m.id !== activeMembership?.id) {
                        (e.target as HTMLElement).style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-sm)',
                      background: m.id === activeMembership?.id
                        ? 'linear-gradient(135deg, var(--primary), var(--accent))'
                        : 'var(--surface-alt)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      color: m.id === activeMembership?.id ? 'white' : 'var(--text-muted)',
                      fontFamily: 'var(--font-heading)',
                      flexShrink: 0,
                      border: m.id === activeMembership?.id ? 'none' : '1px solid var(--border)',
                    }}>
                      {m.community?.name?.charAt(0) || '?'}
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: m.id === activeMembership?.id ? 'var(--primary)' : 'var(--text)',
                        fontFamily: 'var(--font-body)',
                      }}>
                        {m.community?.name}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: 'var(--text-faint)',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        {m.role === 'community_admin' ? 'Admin' : 'Resident'}
                      </div>
                    </div>
                    {m.id === activeMembership?.id && (
                      <span style={{ color: 'var(--primary)', fontSize: 14 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ──── Middle: Navigation Links ──── */}
      <nav style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 12px',
      }}>
        {/* Main items */}
        <NavSection items={mainItems} isActive={isActive} />

        {/* Manage section */}
        {manageItems.length > 0 && (
          <>
            <SectionLabel label="Manage" />
            <NavSection items={manageItems} isActive={isActive} />
          </>
        )}

        {/* Admin section */}
        {adminItems.length > 0 && (
          <>
            <SectionLabel label="Platform" />
            <NavSection items={adminItems} isActive={isActive} />
          </>
        )}
      </nav>

      {/* ──── Bottom: User + Theme + Sign Out ──── */}
      <div style={{
        padding: '12px 14px 16px',
        borderTop: '1px solid var(--border)',
      }}>
        {/* Theme toggle */}
        <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
          <ThemeToggle />
        </div>

        {/* User info + sign out */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 6px',
        }}>
          {/* Avatar */}
          <Link href="/profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(135deg, var(--primary-muted), var(--accent-muted))',
              border: '2px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--primary)',
              fontFamily: 'var(--font-heading)',
              flexShrink: 0,
            }}>
              {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {profile?.full_name || 'User'}
              </div>
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: 10,
                color: 'var(--text-faint)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {profile?.email}
              </div>
            </div>
          </Link>

          <button
            onClick={signOut}
            title="Sign out"
            style={{
              width: 30,
              height: 30,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-faint)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = 'var(--error-bg)';
              (e.target as HTMLElement).style.color = 'var(--error)';
              (e.target as HTMLElement).style.borderColor = 'var(--error)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'transparent';
              (e.target as HTMLElement).style.color = 'var(--text-faint)';
              (e.target as HTMLElement).style.borderColor = 'var(--border)';
            }}
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  );
}

// ============================================================
// Sub-components
// ============================================================

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      fontFamily: 'var(--font-body)',
      fontSize: 10,
      fontWeight: 700,
      color: 'var(--text-faint)',
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      padding: '14px 10px 6px',
    }}>
      {label}
    </div>
  );
}

function NavSection({
  items,
  isActive,
}: {
  items: NavItem[];
  isActive: (href: string) => boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 'var(--radius-sm)',
              background: active ? 'var(--primary-glow)' : 'transparent',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }
            }}
          >
            <span style={{
              fontSize: 15,
              width: 22,
              textAlign: 'center',
              color: active ? 'var(--primary)' : 'var(--text-muted)',
              flexShrink: 0,
            }}>
              {active ? item.activeIcon : item.icon}
            </span>
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              color: active ? 'var(--primary)' : 'var(--text-secondary)',
            }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}