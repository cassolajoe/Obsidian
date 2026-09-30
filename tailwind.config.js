/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          bg: '#0A0A0A',
          card: '#121212',
          cardHover: '#1A1A1A',
          neon: '#7CFF4F',
          neonGlow: 'rgba(124, 255, 79, 0.2)',
          cyan: '#00F0FF',
          crystal: '#FFFFFF',
        }
      },
      backdropBlur: {
        '2xl': '24px',
        '3xl': '32px',
      }
    },
  },
  plugins: [],
}
