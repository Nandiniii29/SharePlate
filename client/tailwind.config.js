/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme 3: Sage Green + Warm Cream + Terracotta
        cream: {
          50: '#FDFBF7',
          100: '#F7F3EC',
          200: '#EFE7DA',
          300: '#DFD2BE',
          400: '#C9B79E',
          500: '#A8957C',
          800: '#42382D',
          900: '#262019',
        },
        sage: {
          50: '#F4F7F4',
          100: '#E6EDE5',
          200: '#C8D9C7',
          300: '#A7C2A5',
          400: '#87A985',
          500: '#5B7A60',
          600: '#48644C',
          700: '#38503C',
          800: '#2B3D2E',
          900: '#1D2A20',
        },
        forest: {
          50: '#F2F5F3',
          100: '#E0E7E2',
          700: '#2C3E32',
          800: '#1F2E23',
          900: '#16221A',
          950: '#0E1711',
        },
        terracotta: {
          50: '#FDF6F3',
          100: '#F9ECE6',
          200: '#F2D4C8',
          300: '#E5B19E',
          400: '#D5866C',
          500: '#C45D3E',
          600: '#A84A2E',
          700: '#8C3B22',
          800: '#712E1A',
          900: '#542112',
        },
        // Backward-compatibility aliases mapped to Theme 3
        coral: {
          50: '#FDF6F3',
          100: '#F9ECE6',
          200: '#F2D4C8',
          500: '#C45D3E',
          600: '#A84A2E',
          700: '#8C3B22',
        },
        leaf: {
          50: '#F4F7F4',
          100: '#E6EDE5',
          200: '#C8D9C7',
          500: '#5B7A60',
          600: '#48644C',
          700: '#38503C',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(38, 32, 25, 0.05), 0 4px 6px -2px rgba(38, 32, 25, 0.02)',
        'premium': '0 10px 30px -5px rgba(38, 32, 25, 0.08), 0 4px 10px -3px rgba(38, 32, 25, 0.03)',
      }
    },
  },
  plugins: [],
}
