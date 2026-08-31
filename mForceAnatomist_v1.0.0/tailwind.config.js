/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'fx-bg-primary': 'var(--fx-bg-primary)',
        'fx-bg-surface': 'var(--fx-bg-surface)',
        'fx-bg-glass': 'var(--fx-bg-glass)',
        'fx-border-subtle': 'var(--fx-border-subtle)',
        'fx-glass-border': 'var(--fx-glass-border)',
        'fx-text-primary': 'var(--fx-text-primary)',
        'fx-text-secondary': 'var(--fx-text-secondary)',
        'fx-accent': 'var(--fx-accent)',
        'fx-accent-secondary': 'var(--fx-accent-secondary)',
        'fx-accent-hover': 'var(--fx-accent-hover)',
        'fx-accent-success': '#34d399',
        'fx-accent-warning': '#facc15',
        'fx-accent-alert': '#f87171',
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Exo 2', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        data: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 20px 40px rgba(0, 0, 0, 0.4)',
        'neon': 'inset 0 1px 0 rgba(16, 185, 129, 0.2)',
        'hover-glow': 'inset 0 1px 0 rgba(45, 212, 191, 0.4)',
      }
    },
  },
  plugins: [],
}
