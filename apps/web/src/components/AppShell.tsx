'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { Sidebar } from './Sidebar';
import { MobileHeader, BottomBar } from './BottomBar';

// Routes that require a specific feature to be enabled
const FEATURE_ROUTES: Record<string, string> = {
  '/events': 'events',
  '/tips': 'tips',
  '/facilities': 'facilities',
  '/bookings': 'facilities',
  '/documents': 'documents',
  '/contacts': 'contacts',
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { loading, activeMembership, isAdmin, isSuperAdmin, features } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // /profile is always accessible
    if (pathname === '/profile') return;

    // No active membership — only super admins can access /admin/* routes
    if (!activeMembership) {
      if (pathname.startsWith('/admin') && isSuperAdmin) return;
      router.replace('/profile');
      return;
    }

    // /admin/* requires super admin
    if (pathname.startsWith('/admin') && !isSuperAdmin) {
      router.replace('/dashboard');
      return;
    }

    // /manage/* requires admin role
    if (pathname.startsWith('/manage') && !isAdmin) {
      router.replace('/dashboard');
      return;
    }

    // Feature-gated routes
    const featureKey = FEATURE_ROUTES[pathname];
    if (featureKey) {
      // If features object has entries and this feature is explicitly disabled
      if (Object.keys(features).length > 0 && features[featureKey] === false) {
        router.replace('/dashboard');
        return;
      }
    }
  }, [loading, pathname, activeMembership, isAdmin, isSuperAdmin, features, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <div
          className="animate-spin"
          style={{
            width: 32,
            height: 32,
            border: '3px solid var(--border)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
          }}
        />
      </div>
    );
  }

  return (
    <>
      {/* Desktop sidebar - hidden on mobile */}
      <div className="sidebar-desktop">
        <Sidebar />
      </div>

      {/* Mobile header - hidden on desktop */}
      <div className="mobile-only">
        <MobileHeader />
      </div>

      {/* Main content area */}
      <main className="app-content">
        {children}
      </main>

      {/* Mobile bottom bar - hidden on desktop */}
      <div className="mobile-only">
        <BottomBar />
      </div>
    </>
  );
}