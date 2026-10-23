/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0B0F17',
        surface: '#121824',
        surfaceHover: '#1A2333',
        border: '#1F293D',
        primary: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          light: '#60A5FA',
        },
        accent: {
          claude: '#D97706',
          codex: '#10B981',
          antigravity: '#8B5CF6',
        },
      },
    },
  },
  plugins: [],
};
