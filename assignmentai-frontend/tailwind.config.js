/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // ── Design DNA: Academic Intelligence System ──────────────────────────
      colors: {
        // Primary Indigo scale
        primary: {
          DEFAULT: '#4338CA',
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
        // Neutral surface system (from Stitch namedColors)
        surface: {
          DEFAULT:   '#F7F9FB',
          dim:       '#D8DADC',
          bright:    '#F7F9FB',
          low:       '#F2F4F6',
          container: '#ECEEF0',
          high:      '#E6E8EA',
          highest:   '#E0E3E5',
          lowest:    '#FFFFFF',
        },
        // Text tones
        ink: {
          primary:   '#191C1E',
          secondary: '#464554',
          muted:     '#777586',
          disabled:  '#94A3B8',
        },
        // Status colors
        success: {
          DEFAULT: '#10B981',
          bg:      '#D1FAE5',
          text:    '#065632',
        },
        warning: {
          DEFAULT: '#F59E0B',
          bg:      '#FEF3C7',
          text:    '#92400E',
        },
        danger: {
          DEFAULT: '#EF4444',
          bg:      '#FEE2E2',
          text:    '#991B1B',
        },
        info: {
          DEFAULT: '#3B82F6',
          bg:      '#DBEAFE',
          text:    '#1947C8',
        },
        // Border
        border: {
          DEFAULT: '#E2E8F0',
          focus:   '#6366F1',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },

      fontSize: {
        // Typography scale from design system
        'display':    ['32px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md':['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'headline-sm':['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg':    ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body':       ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'label-md':   ['14px', { lineHeight: '1.2', fontWeight: '500' }],
        'label-sm':   ['12px', { lineHeight: '1.2', fontWeight: '600' }],
      },

      spacing: {
        // 4px base grid
        '4.5': '18px',
        '18':  '72px',
        '22':  '88px',
        '60':  '240px',  // sidebar width
        '88':  '352px',
      },

      borderRadius: {
        DEFAULT: '8px',
        sm:      '4px',
        md:      '10px',   // inputs / buttons
        lg:      '12px',   // buttons
        xl:      '16px',   // cards
        '2xl':   '20px',
        full:    '9999px', // pills/badges
      },

      boxShadow: {
        // Elevation levels
        'card':   '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.08)',
        'card-hover': '0 4px 16px rgba(67,56,202,0.14), 0 1px 4px rgba(0,0,0,0.08)',
        'modal':  '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
        'input-focus': '0 0 0 3px rgba(99,102,241,0.2)',
        'indigo-glow': '0 0 0 4px rgba(67,56,202,0.12)',
      },

      backgroundImage: {
        'indigo-gradient': 'linear-gradient(135deg, #4338CA 0%, #6366F1 100%)',
        'indigo-brand':    'linear-gradient(135deg, #4338CA 0%, #312E81 100%)',
        'surface-gradient':'linear-gradient(180deg, #F8FAFC 0%, #EEF2FF 100%)',
      },

      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%':   { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        'toast-in': {
          '0%':   { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in':  'fade-in 0.2s ease-out',
        'slide-in': 'slide-in 0.25s ease-out',
        'pulse-dot':'pulse-dot 1.5s ease-in-out infinite',
        'toast-in': 'toast-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
