/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        backgroundDeep: 'var(--background-deep)',
        backgroundBase: 'var(--background-base)',
        backgroundElevated: 'var(--background-elevated)',
        background: 'var(--background-base)',
        surface: 'var(--surface)',
        surfaceHover: 'var(--surface-hover)',
        foreground: 'var(--foreground)',
        mutedForeground: 'var(--muted-foreground)',
        foregroundSubtle: 'var(--foreground-subtle)',
        accent: 'var(--accent)',
        accentBright: 'var(--accent-bright)',
        accentGlow: 'var(--accent-glow)',
        border: 'var(--border)',
        borderHover: 'var(--border-hover)',
        borderAccent: 'var(--border-accent)',
        card: 'var(--surface)',
        cardForeground: 'var(--foreground)',
        muted: 'var(--surface)',
        ring: 'var(--accent)',
      },
      fontFamily: {
        display: ['Inter', 'Geist Sans', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'Geist Sans', 'system-ui', 'sans-serif'],
        serif: ['Inter', 'Geist Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        none: '0',
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.5rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
      boxShadow: {
        card: '0 0 0 1px rgba(255,255,255,0.06), 0 2px 20px rgba(0,0,0,0.4), 0 0 40px rgba(0,0,0,0.2)',
        'card-hover': '0 0 0 1px rgba(255,255,255,0.1), 0 8px 40px rgba(0,0,0,0.5), 0 0 80px rgba(94,106,210,0.1)',
        'accent-glow': '0 0 0 1px rgba(94,106,210,0.5), 0 4px 12px rgba(94,106,210,0.3), inset 0 1px 0 0 rgba(255,255,255,0.2)',
        inset: 'inset 0 1px 0 0 rgba(255,255,255,0.1)',
      },
      transitionTimingFunction: {
        expo: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(1deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
      animation: {
        float: 'float 9s ease-in-out infinite',
        'float-slow': 'float 11s ease-in-out infinite',
        'float-slower': 'float 13s ease-in-out infinite',
        shimmer: 'shimmer 4s linear infinite',
      },
    },
  },
  plugins: [],
}
