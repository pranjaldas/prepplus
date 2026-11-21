import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#1E1B4B', light: '#312E81' },
        primary: { DEFAULT: '#3B82F6', dark: '#2563EB' },
        success: { DEFAULT: '#10B981', light: '#D1FAE5' },
        danger: { DEFAULT: '#EF4444', light: '#FEE2E2' },
      },
      keyframes: {
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(-8px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'loader-bar': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' },
        },
      },
      animation: {
        'toast-in': 'toast-in 200ms ease-out',
        'loader-bar': 'loader-bar 1.1s ease-in-out infinite',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
