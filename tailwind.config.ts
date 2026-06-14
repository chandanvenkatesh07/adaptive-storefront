import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand:    '#E8552D',
        'brand-dark': '#CF4525',
        ink:      '#1C1C1A',
        concrete: '#ECE8E1',
        'concrete-2': '#E2DDD3',
        steel:    '#5B6770',
        'steel-2': '#8A929A',
        line:     '#CFC9BD',
        card:     '#F6F3EE',
      },
      fontFamily: {
        display: ['Archivo', 'system-ui', 'sans-serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        '8xl': '88rem',
      },
    },
  },
  plugins: [],
};

export default config;
