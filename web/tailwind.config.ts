import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '40px' }],
        '5xl': ['48px', { lineHeight: '1' }],
      },
      colors: {
        brand: {
          50: '#fef4f2',
          100: '#fde8e3',
          200: '#fbd5cc',
          300: '#f7b5a6',
          400: '#f08d76',
          500: '#E8634A',
          600: '#d44a32',
          700: '#b33a25',
          800: '#943222',
          900: '#7b2e22',
        },
        accent: {
          50: '#fffbf0',
          100: '#fff4d6',
          200: '#ffe9ad',
          300: '#ffd97a',
          400: '#f5c24b',
          500: '#F5A623',
          600: '#db8c12',
          700: '#b66e0d',
          800: '#935712',
          900: '#794814',
        },
        ig: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          elevated: 'var(--bg-elevated)',
          hover: 'var(--bg-hover)',
          border: 'var(--border)',
          'border-light': 'var(--border-light)',
          separator: 'var(--separator)',
          'text-primary': 'var(--text-primary)',
          'text-secondary': 'var(--text-secondary)',
          'text-tertiary': 'var(--text-tertiary)',
          blue: '#0095f6',
          'blue-hover': '#1877f2',
          error: '#ed4956',
          success: '#58c322',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        pill: '100px',
      },
    },
  },
  plugins: [],
};

export default config;
