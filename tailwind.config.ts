import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        crimson: { DEFAULT: '#800020', dark: '#5C0017' },
        gold: { DEFAULT: '#D4AF37', soft: '#EFE0AE' },
        ivory: '#FFFDD0',
        surface: '#FFFDF2',
        ink: '#241A1C',
        muted: '#6F6265',
        hairline: '#E8E1D4',
        success: '#2F6B3B',
        warning: '#9A6700',
        error: '#B42318',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Noto Sans', 'Arial', 'sans-serif'],
        serif: ['Iowan Old Style', 'Palatino Linotype', 'Georgia', 'Times New Roman', 'serif'],
      },
      borderRadius: { card: '12px' },
      boxShadow: {
        card: '0 1px 2px rgba(36, 26, 28, 0.06)',
        raised: '0 2px 8px rgba(36, 26, 28, 0.10)',
      },
      spacing: { 'safe-bottom': 'env(safe-area-inset-bottom)' },
      minHeight: { touch: '48px' },
      minWidth: { touch: '48px' },
    },
  },
  plugins: [],
};

export default config;
