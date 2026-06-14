/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary indigo-violet gradient palette
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        // Accent coral/rose
        accent: {
          50:  '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
        },
        // Emerald for positive balances
        emerald: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        // Glass surface
        glass: {
          DEFAULT: 'rgba(255,255,255,0.07)',
          light: 'rgba(255,255,255,0.12)',
          border: 'rgba(255,255,255,0.15)',
        },
        surface: {
          DEFAULT: '#0f0f1a',
          card: '#161627',
          elevated: '#1e1e35',
          hover: '#252540',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-brand': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
        'gradient-hero': 'linear-gradient(135deg, #0f0f1a 0%, #1a1040 50%, #0d1117 100%)',
        'gradient-card': 'linear-gradient(145deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.04) 100%)',
        'gradient-success': 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
        'gradient-danger': 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)',
      },
      boxShadow: {
        'glow': '0 0 40px rgba(99,102,241,0.3)',
        'glow-sm': '0 0 20px rgba(99,102,241,0.2)',
        'glow-emerald': '0 0 30px rgba(16,185,129,0.25)',
        'glow-rose': '0 0 30px rgba(244,63,94,0.25)',
        'card': '0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.06) inset',
        'card-hover': '0 8px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.08) inset',
        'modal': '0 25px 80px rgba(0,0,0,0.7)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideInRight: { from: { opacity: 0, transform: 'translateX(20px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
