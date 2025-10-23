/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {
        colors: {
          // Primary warm orange - Main brand color
          primary: {
            50: '#FFF5ED',
            100: '#FFE6D5',
            200: '#FFCCAA',
            300: '#FFB380',
            400: '#FF9955',
            500: '#FF6B35', // Main brand color
            600: '#E85A2A',
            700: '#D04A20',
            800: '#B83A15',
            900: '#9F2A0B',
          },
          // Night theme - For headers and premium elements
          night: {
            50: '#E8E9F0',
            100: '#D1D3E1',
            200: '#A3A7C3',
            300: '#757BA5',
            400: '#474F87',
            500: '#2D3561', // Main night color
            600: '#232946',
            700: '#1A1F3A',
            800: '#12152D',
            900: '#090B20',
          },
          // Accent colors
          accent: {
            coral: '#FF4757',
            golden: '#FFC857',
            green: '#10B981',
          },
          // Neutrals with warmth
          warm: {
            cream: '#FFF8F0',
            'gray-light': '#F8F6F4',
            gray: '#9CA3AF',
            'gray-dark': '#374151',
          }
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
          display: ['Inter', 'system-ui', 'sans-serif'],
        },
        borderRadius: {
          'xl': '1rem',
          '2xl': '1.5rem',
        },
        boxShadow: {
          'warm': '0 4px 6px rgba(255, 107, 53, 0.1)',
          'warm-lg': '0 10px 15px rgba(255, 107, 53, 0.1)',
        }
      },
    },
    plugins: [],
  }