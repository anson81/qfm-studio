module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // QFM Brand Palette
        primary: {
          DEFAULT: '#7c3aed',       // Vibrant purple — creative + premium
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',           // Main purple
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          foreground: '#ffffff',     // White text on primary bg
        },
        accent: {
          DEFAULT: '#f59e0b',       // Gold — Malaysian fashion premium feel
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        sidebar: {
          DEFAULT: '#0f172a',       // Deep navy (slate-900)
          hover: '#1e293b',         // Slate-800
          active: '#7c3aed',        // Purple indicator
          text: '#94a3b8',          // Slate-400
          'text-active': '#ffffff', // White for active items
          border: '#1e293b',        // Subtle border
        },
        background: '#f8fafc',      // Slate-50 — warm white
        foreground: '#0f172a',      // Slate-900 — near-black
        muted: {
          DEFAULT: '#f1f5f9',       // Slate-100 — light bg (NOT the old #6b7280)
          foreground: '#64748b',     // Slate-500 — readable secondary text
        },
        card: {
          DEFAULT: '#ffffff',
          foreground: '#0f172a',
        },
        border: '#cbd5e1',           // Slate-300 — visible borders
        destructive: '#ef4444',
        success: '#22c55e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'login-gradient': 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 50%, #1e1b4b 100%)',
      },
    },
  },
  plugins: [],
};