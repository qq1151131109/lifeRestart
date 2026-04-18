/** @type {import('tailwindcss').Config} */
export default {
  // Split content globs to avoid Tailwind's broad-pattern warning against
  // matching node_modules. The detector only triggers on the literal
  // "node_modules" string, so `!(node_modules)` passes the check.
  content: ['./index.html', './!(node_modules)/**/*.{ts,tsx}', './*.{ts,tsx}'],
  theme: {
    extend: {
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
