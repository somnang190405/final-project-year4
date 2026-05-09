module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // This overrides purple to be black
        purple: {
          500: '#000000',
          600: '#000000',
          700: '#1a1a1a',
        },
      },
    },
  },
  plugins: [],
}