'use client';

import { useAuth } from '../lib/auth-context';
import { Sidebar } from './Sidebar';
import { MobileHeader, BottomBar } from './BottomBar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

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