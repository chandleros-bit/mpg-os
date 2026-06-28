/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#1B2B5E',
        'navy-deep': '#14213F',
        ink: '#1A1A2E',
        accent: '#169DD1',
        'accent-deep': '#0F7FAD',
        light: '#BFEAF5',
        gold: '#C9A84C',
        'gold-bright': '#E4C66A',
        win: '#1F9D55',
        loss: '#9AA3B2',
        bg: '#F6F7F9',
        line: '#E6E8EE',
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};
