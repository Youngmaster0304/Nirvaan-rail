/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // design tokens (task_plan.md §1)
        'canvas': '#dde4ef',
        'ink': '#0d1a2d',
        'ink-muted': '#546380',
        'hairline': '#dce5f0',
        'hairline-strong': '#c8d4e6',
        'navy': '#002d62',
        'navy-bright': '#004492',
        'navy-deep': '#001a3a',
        'saffron': '#f9931e',
        'rail-green': '#138808',
        'rail-red': '#b91c1c',
        // legacy tokens still referenced by existing components
        'ir-blue': '#003366',
        'ir-blue-light': '#1a4d80',
        'ir-blue-pale': '#e6f0f9',
        'gov-saffron': '#FF9933',
        'gov-green': '#138808',
        'ashoka-blue': '#000080',
        'status-approved': '#0a6b21',
        'status-pending': '#92400e',
        'status-rejected': '#7f1d1d',
        'status-merged': '#002d62',
        'status-urgent': '#7f1d1d',
        'bg-primary': '#dde4ef',
        'bg-panel': '#ffffff',
        // tinted surfaces (same family as the canvas, used for rows / panels)
        'tints': {
          50: '#fafcff',
          100: '#f8fafd',
          200: '#f7fafd',
          300: '#f4f8ff',
          400: '#f2f6fd',
          500: '#eef3fa',
          600: '#ebf0fa',
          700: '#e8eef7',
          800: '#e6ecf6',
          900: '#e4ecf7',
          950: '#e0eaff',
          deep: '#dde6f2'
        },
        // status surfaces (warning / danger / info / success)
        'warn-line': '#f5c070',
        'warn-surface': '#fef3e2',
        'warn-icon': '#b45309',
        'danger-line': '#f87171',
        'danger-surface': '#fee2e2',
        'info-line': '#93b4f0',
        'ok-line': '#8dd4a0',
        'ok-surface': '#e5f4ea',
        'panel-line': '#cfdcee',
        'panel-grid': '#e4ebf5'
      },
      fontFamily: {
        sans: ['"Noto Sans"', '"Noto Sans Devanagari"', 'Arial', 'sans-serif'],
        heading: ['"Noto Sans"', '"Noto Sans Devanagari"', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', '"Courier New"', 'monospace'],
        hindi: ['"Noto Sans Devanagari"', '"Noto Sans"', 'sans-serif']
      },
      boxShadow: {
        'gov-sm': '0 1px 2px 0 rgba(0, 45, 98, 0.06)',
        'gov-md': '0 2px 4px 0 rgba(0, 45, 98, 0.08), 0 6px 18px 0 rgba(0, 45, 98, 0.07)',
        'gov-lg': '0 4px 10px 0 rgba(0, 45, 98, 0.10), 0 14px 32px 0 rgba(0, 45, 98, 0.08)',
      },
      maxWidth: {
        'console': '1700px',
      },
      borderRadius: {
        'card': '4px',
        'chip': '2px',
      }
    },
  },
  plugins: [],
}
