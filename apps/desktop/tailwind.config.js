/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neural depth layers (organic gradient from deepest to lightest)
        background: '#060810',
        'background-secondary': '#0A0E16',
        canvas: '#0C1018',
        panel: '#101520',
        'panel-hover': '#141A28',
        surface: '#182030',
        'surface-elevated': '#1E2838',
        'surface-highlight': '#243040',
        'surface-active': '#1A2E38',
        
        // Border system
        border: {
          subtle: 'rgba(255, 255, 255, 0.04)',
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.14)',
          focus: 'rgba(16, 185, 129, 0.5)',
        },
        
        // Text hierarchy
        text: {
          primary: '#E8ECF0',
          secondary: '#94A3B8',
          tertiary: '#64748B',
          muted: '#475569',
        },
        
        // Brand colors — Emerald + Gold neural identity
        brand: {
          primary: '#10B981',
          'primary-light': '#34D399',
          'primary-dark': '#059669',
          secondary: '#FBBF24',
          'secondary-light': '#FCD34D',
          'secondary-dark': '#D97706',
          glow: '#10B981',
        },
        
        accent: {
          emerald: '#10B981',
          teal: '#14B8A6',
          gold: '#FBBF24',
          amber: '#F59E0B',
        },
        
        status: {
          success: '#10B981',
          warning: '#FBBF24',
          error: '#EF4444',
          info: '#38BDF8',
        },
        
        // Neural-specific
        neural: {
          glow: 'rgba(16, 185, 129, 0.15)',
          'glow-strong': 'rgba(16, 185, 129, 0.25)',
          'glow-gold': 'rgba(251, 191, 36, 0.15)',
          synapse: 'rgba(16, 185, 129, 0.4)',
          dendrite: 'rgba(20, 184, 166, 0.3)',
        },
      },
      spacing: {
        'sidebar': '72px',
        'header': '44px',
        'page-x': '2rem',
        'page-y': '1.5rem',
      },
      borderRadius: {
        'card': '16px',
        'button': '10px',
        'input': '10px',
        'pill': '9999px',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'xxs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        'glow-emerald': '0 0 24px -4px rgba(16, 185, 129, 0.3)',
        'glow-emerald-lg': '0 0 40px -8px rgba(16, 185, 129, 0.25)',
        'glow-gold': '0 0 24px -4px rgba(251, 191, 36, 0.2)',
        'glow-teal': '0 0 20px -4px rgba(20, 184, 166, 0.2)',
        'neural-pulse': '0 0 30px -5px rgba(16, 185, 129, 0.2), 0 0 60px -10px rgba(16, 185, 129, 0.1)',
        'elevated': '0 16px 32px -8px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(16, 185, 129, 0.06)',
        'card': '0 4px 16px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.04)',
        'card-hover': '0 8px 28px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(16, 185, 129, 0.12)',
        'inner-glow': 'inset 0 1px 0 0 rgba(16, 185, 129, 0.06)',
        'neural-border': '0 0 0 1px rgba(16, 185, 129, 0.08)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 2s infinite linear',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-subtle': 'bounceSoft 1s ease-in-out infinite',
        'neural-pulse': 'neuralPulse 4s ease-in-out infinite',
        'glow-breathe': 'glowBreathe 3s ease-in-out infinite',
        'synapse-fire': 'synapseFire 0.6s ease-out',
        'dendrite-grow': 'dendriteGrow 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
        neuralPulse: {
          '0%, 100%': { boxShadow: '0 0 20px -5px rgba(16, 185, 129, 0.15)' },
          '50%': { boxShadow: '0 0 35px -5px rgba(16, 185, 129, 0.3)' },
        },
        glowBreathe: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        synapseFire: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        dendriteGrow: {
          '0%': { transform: 'scaleX(0)', transformOrigin: 'left' },
          '100%': { transform: 'scaleX(1)', transformOrigin: 'left' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
