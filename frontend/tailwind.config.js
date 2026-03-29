/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#00D4AA',
        'brand-secondary': '#7C3AED',
        'brand-accent': '#F59E0B',
        'bg-base': '#060611',
        'bg-surface': '#0D0D1A',
        'bg-card': '#12121F',
        'bg-elevated': '#1A1A2E',
        'bg-hover': '#1E1E30',
        'text-primary': '#F0F0FF',
        'text-secondary': '#8B8BA8',
        'text-muted': '#4A4A6A',
        'text-brand': '#00D4AA',
        'border-subtle': 'rgba(255,255,255,0.06)',
        'border-default': 'rgba(255,255,255,0.10)',
        'border-strong': 'rgba(0,212,170,0.30)',
        'green': '#00D4AA',
        'red': '#FF4560',
        'yellow': '#F59E0B',
        'blue': '#3B82F6',
        'purple': '#7C3AED',
      },
      fontFamily: {
        'display': ['Space Grotesk', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

