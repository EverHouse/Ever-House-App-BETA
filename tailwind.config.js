/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ["Inter", "sans-serif"],
        sans: ["Inter", "sans-serif"],
        serif: ["Inter", "sans-serif"],
      },
      colors: {
        primary: "#293515",
        secondary: "#E7E7DC",
        accent: "#CCB8E4",
        surface: {
          light: "#FFFFFF",
          dark: "rgba(255, 255, 255, 0.05)",
        },
        brand: {
          green: "#293515",
          bone: "#F2F2EC",
          lavender: "#CCB8E4"
        },
      },
      backgroundImage: {
        'liquid-gradient': 'linear-gradient(135deg, #293515 0%, #1a210d 100%)',
        'glass-gradient': 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        'glow': '0 0 20px rgba(204, 184, 228, 0.2)',
        'inner-light': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
      },
      borderRadius: {
        'lg': '8px',
        'xl': '12px',
        '2xl': '20px',
        '3xl': '28px',
        'full': '9999px',
      },
      animation: {
        'pop-in': 'pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) backwards',
        'slide-in-left': 'slide-in-left 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-out-right': 'slide-out-right 0.3s ease-in forwards',
      },
      keyframes: {
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-out-right': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        }
      }
    },
  },
  plugins: [],
}
