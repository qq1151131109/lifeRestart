/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './!(node_modules)/**/*.{ts,tsx}', './*.{ts,tsx}'],
  theme: {
    extend: {
      minHeight: { dvh: '100dvh' },
      height: { dvh: '100dvh' },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
    },
  },
  plugins: [],
}
