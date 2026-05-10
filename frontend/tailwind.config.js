/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        studio: {
          bg:       '#141210',
          surface:  '#1e1b18',
          panel:    '#232019',
          border:   '#332f2a',
          hover:    '#2e2a26',
          accent:   '#2d6a4f',
          'accent-light': '#40916c',
          text:     '#e7e3dc',
          muted:    '#8c857c',
          faint:    '#4a4540',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
