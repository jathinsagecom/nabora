'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { getBottomBarItems, getVisibleNavItems, type NavItem } from '../lib/navigation';
import { NaboraLogo } from './NaboraLogo';
import { ThemeToggle } from './ThemeToggle';

export function MobileHeader() {
  const { activeCommunity, memberships, activeMembership, switchCommunity } = useAuth();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 56,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      zIndex: 40,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>
      <NaboraLogo size={28} showText={false} />

      {/* Community name / switcher */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => memberships.length > 1 && setSwitcherOpen(!switcherOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'var(--surface-alt)',
            cursor: memberships.length > 1 ? 'pointer' : 'default',
          }}
        >
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text)',
          }}>
            {activeCommunity?.name || 'Nabora'}
          </span>
          {memberships.length > 1 && (
            <span style={{
              fontSize: 8,
              color: 'var(--text-faint)',
              transform: switcherOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
            }}>▼</span>
          )}
        </button>

        {switcherOpen && (
          <>
            <div
              onClick={() => setSwitcherOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 49 }}
            />
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              minWidth: 220,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--card-shadow)',
              zIndex: 50,
              padding: 6,
            }}>
              {memberships.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { switchCommunity(m); setSwitcherOpen(false); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    background: m.id === activeMembership?.id ? 'var(--primary-glow)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: 'var(--radius-sm)',
                    background: m.id === activeMembership?.id
                      ? 'linear-gradient(135deg, var(--primary), var(--accent))'
                      : 'var(--surface-alt)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    color: m.id === activeMembership?.id ? 'white' : 'var(--text-muted)',
                    fontFamily: 'var(--font-heading)',
                    border: m.id === activeMembership?.id ? 'none' : '1px solid var(--border)',
                  }}>
                    {m.community?.name?.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600,
                      color: m.id === activeMembership?.id ? 'var(--primary)' : 'var(--text)',
                    }}>{m.community?.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                      {m.role === 'community_admin' ? 'Admin' : 'Resident'}
                    </div>
                  </div>
                  {m.id === activeMembership?.id && (
                    <span style={{ color: 'var(--primary)', fontSize: 13 }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <ThemeToggle />
    </header>
  );
}

export function BottomBar() {
  const pathname = usePathname();
  const { role, isSuperAdmin, features, profile, signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const bottomItems = getBottomBarItems(role, isSuperAdmin, features);
  const allItems = getVisibleNavItems(role, isSuperAdmin, features);
  const moreItems = allItems.filter(
    (item) => !item.showInBottomBar || item.section !== 'main'
  );

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <>
          <div
            onClick={() => setMoreOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 59,
            }}
          />
          <div style={{
            position: 'fixed',
            bottom: 72,
            left: 12,
            right: 12,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--card-shadow)',
            zIndex: 60,
            padding: 8,
            maxHeight: 'calc(100vh - 160px)',
            overflowY: 'auto',
          }}>
            {/* User info */}
            <Link href="/profile" onClick={() => setMoreOpen(false)} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 10px',
                borderBottom: '1px solid var(--border)',
                marginBottom: 6,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-full)',
                  background: 'linear-gradient(135deg, var(--primary-muted), var(--accent-muted))',
                  border: '2px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: 'var(--primary)',
                  fontFamily: 'var(--font-heading)',
                }}>
                  {profile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {profile?.full_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                    {profile?.email}
                  </div>
                </div>
              </div>
            </Link>

            {/* Menu items grouped by section */}
            {['main', 'manage', 'admin'].map((section) => {
              const sectionItems = moreItems.filter((i) => i.section === section);
              if (sectionItems.length === 0) return null;
              return (
                <div key={section}>
                  {section !== 'main' && (
                    <div style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--text-faint)',
                      textTransform: 'uppercase',
                      letterSpacing: 1.2,
                      padding: '10px 10px 4px',
                    }}>
                      {section === 'manage' ? 'Manage' : 'Platform'}
                    </div>
                  )}
                  {sectionItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '11px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: active ? 'var(--primary-glow)' : 'transparent',
                          textDecoration: 'none',
                        }}
                      >
                        <span style={{
                          fontSize: 15,
                          width: 22,
                          textAlign: 'center',
                          color: active ? 'var(--primary)' : 'var(--text-muted)',
                        }}>
                          {active ? item.activeIcon : item.icon}
                        </span>
                        <span style={{
                          fontSize: 13,
                          fontWeight: active ? 700 : 500,
                          color: active ? 'var(--primary)' : 'var(--text-secondary)',
                          fontFamily: 'var(--font-body)',
                        }}>
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}

            {/* Sign out */}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}>
              <button
                onClick={() => { setMoreOpen(false); signOut(); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 15, width: 22, textAlign: 'center', color: 'var(--error)' }}>⏻</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--error)', fontFamily: 'var(--font-body)' }}>Sign out</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bottom tab bar */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '0 8px',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
        zIndex: 40,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
        {bottomItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
                minWidth: 56,
              }}
            >
              <span style={{
                fontSize: 18,
                color: active ? 'var(--primary)' : 'var(--text-muted)',
                transition: 'color 0.15s ease',
              }}>
                {active ? item.activeIcon : item.icon}
              </span>
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                color: active ? 'var(--primary)' : 'var(--text-faint)',
              }}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: moreOpen ? 'var(--primary-glow)' : 'transparent',
            cursor: 'pointer',
            minWidth: 56,
          }}
        >
          <span style={{
            fontSize: 18,
            color: moreOpen ? 'var(--primary)' : 'var(--text-muted)',
          }}>
            ≡
          </span>
          <span style={{
            fontFamily: 'var(--font-body)',
            fontSize: 10,
            fontWeight: moreOpen ? 700 : 500,
            color: moreOpen ? 'var(--primary)' : 'var(--text-faint)',
          }}>
            More
          </span>
        </button>
      </nav>
    </>
  );
}