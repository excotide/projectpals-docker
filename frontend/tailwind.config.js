/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        pp: {
          bg:       '#101415', // main background
          card:     '#161c1e', // card surfaces
          elevated: '#1b2022', // search bar, inputs, nav hover
          active:   '#1e2628', // active nav item
          border:   '#252c2e', // subtle neutral-gray borders (no blue tint)
          chip:     '#2e3739', // toggle/chip borders
          logout:   '#1f1014', // logout hover bg
        },
      },
      fontFamily: {
        sans: ["Sora", "'Segoe UI'", "sans-serif"],
      },
    },
  },
  plugins: [],
}
