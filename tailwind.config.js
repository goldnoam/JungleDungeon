module.exports = {
  content: ["./index.html", "./App.tsx", "./index.tsx"],
  theme: {
    extend: {
      fontFamily: {
        fancy: ['Cinzel', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'flicker': 'flicker 2s infinite',
        'float': 'float 3s ease-in-out infinite',
        'rain': 'rain 0.5s linear infinite',
        'pulse-fast': 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '0.9', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        rain: {
          '0%': { transform: 'translateY(-20px)' },
          '100%': { transform: 'translateY(20px)' }
        }
      }
    },
  },
  plugins: [],
}