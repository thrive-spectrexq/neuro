/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Apple Space Black & Midnight Depth Hierarchy
        background: '#000000',
        'background-secondary': '#0A0A0D',
        canvas: '#101014',
        panel: '#16161B',
        'panel-hover': '#1F1F26',
        surface: '#1C1C20',
        'surface-elevated': '#28282F',
        'surface-highlight': '#34343D',
        'surface-active': '#22222A',
        
        // Apple Hairline Border System
        border: {
          subtle: 'rgba(255, 255, 255, 0.05)',
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.16)',
          focus: '#0071E3',
        },
        
        // Apple Human Interface Text Hierarchy
        text: {
          primary: '#F5F5F7',
          secondary: '#A1A1A6',
          tertiary: '#86868B',
          muted: '#6E6E73',
        },
        
        // Apple Brand Identity — Cupertino Blue & Siri / Apple Intelligence
        brand: {
          primary: '#0071E3',
          'primary-light': '#0A84FF',
          'primary-dark': '#0058B6',
          secondary: '#5E5CE6',
          'secondary-light': '#7D7AFF',
          'secondary-dark': '#4845B2',
          glow: '#0071E3',
          emerald: '#30D158',
          'emerald-light': '#34C759',
        },
        
        accent: {
          blue: '#0071E3',
          indigo: '#5E5CE6',
          purple: '#BF5AF2',
          mint: '#30D158',
          teal: '#40C8E0',
          amber: '#FF9F0A',
          coral: '#FF453A',
        },
        
        status: {
          success: '#30D158',
          warning: '#FF9F0A',
          error: '#FF453A',
          info: '#0A84FF',
        },
        
        // Apple Intelligence Iridescent Tokens
        intelligence: {
          glow: 'rgba(0, 113, 227, 0.15)',
          'glow-strong': 'rgba(10, 132, 255, 0.3)',
          violet: 'rgba(191, 90, 242, 0.2)',
          siri: 'rgba(94, 92, 230, 0.35)',
        },
      },
      borderRadius: {
        'card': '18px',
        'card-lg': '24px',
        'button': '9999px',
        'input': '12px',
        'pill': '9999px',
      },
      fontFamily: {
        sans: [
          '"SF Pro Display"',
          '"SF Pro Text"',
          '-apple-system',
          'BlinkMacSystemFont',
          'Inter',
          '"Plus Jakarta Sans"',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          '"SF Mono"',
          '"JetBrains Mono"',
          'ui-monospace',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        'glow-apple': '0 0 24px -4px rgba(0, 113, 227, 0.35)',
        'glow-apple-lg': '0 0 44px -8px rgba(0, 113, 227, 0.3)',
        'glow-emerald': '0 0 24px -4px rgba(48, 209, 88, 0.3)',
        'glow-intelligence': '0 0 35px -5px rgba(94, 92, 230, 0.3), 0 0 70px -10px rgba(0, 113, 227, 0.2)',
        'elevated': '0 16px 36px -8px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'card': '0 2px 10px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)',
        'card-hover': '0 8px 30px -4px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.14)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
        'apple-float': '0 24px 48px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.12)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        'shimmer': 'shimmer 2.5s infinite linear',
        'spin-slow': 'spin 4s linear infinite',
        'bounce-subtle': 'bounceSoft 1s ease-in-out infinite',
        'intelligence-pulse': 'intelligencePulse 3s ease-in-out infinite',
        'glow-breathe': 'glowBreathe 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97) translateY(4px)' },
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
        intelligencePulse: {
          '0%, 100%': { boxShadow: '0 0 25px -4px rgba(0, 113, 227, 0.25)' },
          '50%': { boxShadow: '0 0 45px -4px rgba(94, 92, 230, 0.45)' },
        },
        glowBreathe: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
