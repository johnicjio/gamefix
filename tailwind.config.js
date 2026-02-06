/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ludo-red': '#FF4757',
        'ludo-green': '#26de81',
        'ludo-yellow': '#fed330',
        'ludo-blue': '#45aaf2',
      },
      animation: {
        'dice-roll': 'diceRoll 1s cubic-bezier(0.4, 0, 0.2, 1)',
        'piece-hop': 'pieceHop 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        diceRoll: {
          '0%': { transform: 'rotate3d(1, 1, 1, 0deg)' },
          '50%': { transform: 'rotate3d(1, 1, 1, 720deg) scale(1.2)' },
          '100%': { transform: 'rotate3d(1, 1, 1, 1080deg) scale(1)' },
        },
        pieceHop: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}