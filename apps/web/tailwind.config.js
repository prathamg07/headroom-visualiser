/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'red-primary': '#E53935',
        'blue-primary': '#1E88E5',
        'yellow-primary': '#FDD835',
        'red-fill': '#D64545',
        'blue-fill': '#2D6CDF',
        'yellow-fill': '#E8C547',
        black: '#0A0A0A',
        white: '#FFFFFF',
        ground: '#FAFAFA',
        surface: '#FFFFFF',
        'surface-inverse': '#0A0A0A',
        'ink-900': '#111111',
        'ink-700': '#333333',
        'ink-500': '#666666',
        'ink-300': '#B3B3B3',
      },
      fontFamily: {
        ui: ['Jost', 'Futura', 'Century Gothic', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        0: '0px',
        1: '2px',
        full: '9999px',
      },
      borderWidth: {
        2: '2px',
        3: '3px',
      },
    },
  },
  plugins: [],
};
