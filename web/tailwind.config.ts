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
          'var(--font-bricolage)',
          'var(--font-archivo)',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        display: [
          'var(--font-archivo)',
          'var(--font-bricolage)',
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
          50: '#FBF1F5',
          100: '#F3DCE6',
          200: '#E9B9CC',
          300: '#DE91AD',
          400: '#D47492',
          500: '#C95A7D',
          600: '#B24E71',
          700: '#9B4366',
          800: '#71314D',
          900: '#4D2136',
        },
        accent: {
          50: '#FCF7E8',
          100: '#F2E5BE',
          200: '#E7D18C',
          300: '#DDBB58',
          400: '#D8B246',
          500: '#D4AA3A',
          600: '#B78B25',
          700: '#936E1D',
          800: '#705316',
          900: '#503B10',
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
          blue: '#4963B8',
          'blue-hover': '#3F58A7',
          error: '#C44952',
          success: '#98B54A',
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
