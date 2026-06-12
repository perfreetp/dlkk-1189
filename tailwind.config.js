/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        'bg-primary': '#0a0a1a',
        'bg-secondary': '#111827',
        'bg-tertiary': '#1e293b',
        'accent-cyan': '#00d2ff',
        'accent-blue': '#0f3460',
        'error-pink': '#e94560',
        'success-emerald': '#10b981',
        'warning-amber': '#f59e0b',
        'text-primary': '#e2e8f0',
        'text-secondary': '#94a3b8',
        'border-dark': '#1e293b',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'shake': 'shake 0.3s ease-in-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 210, 255, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 210, 255, 0.4)' },
        },
      },
    },
  },
  plugins: [],
};
