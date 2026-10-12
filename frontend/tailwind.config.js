/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aubergine: {
          DEFAULT: "#24172F",
          dark: "#1A1022",
          light: "#2E1E3C",
        },
        plum: {
          DEFAULT: "#33253D",
          light: "#3E2E4A",
          border: "#4A3857",
        },
        cream: {
          DEFAULT: "#F6F0E7",
          light: "#FAF7F2",
          dark: "#EDE4D6",
        },
        paper: "#FFFCF6",
        coral: {
          DEFAULT: "#F26B4F",
          hover: "#E8593A",
          light: "#FDF0ED",
        },
        tangerine: {
          DEFAULT: "#FF955E",
          hover: "#F38146",
        },
        amber: {
          DEFAULT: "#F2C66D",
          light: "#FDF7EB",
          dark: "#D4A342",
        },
        mint: {
          DEFAULT: "#9ED8B2",
          light: "#EFF9F3",
          dark: "#68A880",
        },
        mauve: {
          DEFAULT: "#B7A5C8",
          light: "#F2EEF6",
          dark: "#9884AB",
        },
        ink: {
          DEFAULT: "#28212D",
          muted: "#6F6574",
          subtle: "#9B91A0",
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(120deg, #F26B4F 0%, #FF955E 55%, #F2C66D 100%)',
        'hero-dark': 'linear-gradient(135deg, #24172F 0%, #33253D 55%, #50364E 100%)',
        'analytics-accent': 'linear-gradient(135deg, #9ED8B2 0%, #F2C66D 100%)',
      },
    },
  },
  plugins: [],
}
