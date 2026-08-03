/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: '#0b0e14',
          panel: '#111520',
          panelLight: '#161b28',
          border: '#232838',
          accent: '#38bdf8',
          accentDark: '#0ea5e9',
          text: '#e2e8f0',
          muted: '#8b93a7',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};
