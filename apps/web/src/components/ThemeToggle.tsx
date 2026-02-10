'use client';

import { useThemeStore } from '../lib/theme';

export function ThemeToggle() {
  const { mode, toggleMode } = useThemeStore();

  return (
    <button
      onClick={toggleMode}
      aria-label={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        background: 'var(--surface-alt)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Toggle track */}
      <div
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: mode === 'dark' ? 'var(--primary)' : 'var(--text-muted)',
          position: 'relative',
          transition: 'background 0.3s ease',
        }}
      >
        {/* Toggle thumb */}
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: 'white',
            position: 'absolute',
            top: 3,
            left: mode === 'dark' ? 19 : 3,
            transition: 'left 0.3s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
        }}
      >
        {mode === 'dark' ? '🌙' : '☀️'}
      </span>
    </button>
  );
}