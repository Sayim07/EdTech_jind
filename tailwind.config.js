/** @type {import('tailwindcss').Config} */
// Design tokens follow DESIGN.md (Coursera design analysis).
// The legacy palette names used across the app are remapped onto the published blue ramp,
// blue-tinted neutrals and the positive green so every page picks the system up from here.
const blue = {
  50: '#f0f6ff',
  100: '#e3eeff',
  200: '#c4dbff',
  300: '#8fbaf7',
  400: '#4d8fec',
  500: '#0060eb',
  600: '#0056d2',
  700: '#0b408b',
  800: '#002457',
  900: '#001a40',
  950: '#001129',
};

module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#0056d2', hover: '#0060eb', deep: '#0b408b', navy: '#002457' },
        canvas: { DEFAULT: '#ffffff', subtle: '#f2f5fa' },
        tint: { DEFAULT: '#e3eeff', soft: '#f0f6ff', faint: '#f4faff' },
        line: '#dae1ed',
        warm: '#ffeac9',
        amber: blue,
        brand: blue,
        gray: {
          50: '#f7f9fc',
          100: '#f2f5fa',
          200: '#dae1ed',
          300: '#c5cfe0',
          400: '#8591a9',
          500: '#5b6782',
          600: '#48546e',
          700: '#2f3a50',
          800: '#1a2030',
          900: '#0d0f12',
        },
        ink: { 800: '#0b408b', 900: '#002457', 950: '#002457' },
        emerald: {
          50: '#edf7eb',
          100: '#d7eed3',
          200: '#b0dca8',
          300: '#7fc473',
          400: '#4ea543',
          500: '#2d8524',
          600: '#1e6a16',
          700: '#1e6a16',
          800: '#16500f',
          900: '#0f3a0a',
        },
        green: { 800: '#1e6a16' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', "'Source Sans Pro'", 'Arial', 'sans-serif'],
        serif: ['var(--font-sans)', "'Source Sans Pro'", 'Arial', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '4px',
        md: '8px',
        lg: '8px',
        xl: '8px',
        '2xl': '16px',
        '3xl': '16px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(13,15,18,0.06)',
        DEFAULT: '0 1px 3px rgba(13,15,18,0.08)',
        md: '0 2px 8px rgba(13,15,18,0.08)',
        lg: '0 4px 16px rgba(13,15,18,0.08)',
        xl: '0 8px 24px rgba(13,15,18,0.10)',
        '2xl': '0 12px 32px rgba(13,15,18,0.12)',
      },
      letterSpacing: { display: '-0.01em', heading: '-0.01em' },
    },
  },
  plugins: [],
};
