'use client';

interface NaboraLogoProps {
  size?: number;
  showText?: boolean;
}

export function NaboraLogo({ size = 44, showText = true }: NaboraLogoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      {/* Logo mark */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          background: 'linear-gradient(135deg, var(--primary), var(--accent))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px var(--primary-glow)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: size * 0.5,
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            color: 'white',
            lineHeight: 1,
          }}
        >
          N
        </span>
      </div>

      {/* Wordmark */}
      {showText && (
        <span
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: size * 0.5,
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: '-0.03em',
          }}
        >
          Nabora
        </span>
      )}
    </div>
  );
}