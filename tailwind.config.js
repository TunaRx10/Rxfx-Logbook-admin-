/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /*
         * Semantic tokens mapped to journal-app CSS variables. The raw
         * OKLCH channels (--cyan-base / --gain-base / --loss-base) live in
         * src/index.css; wrapping in `oklch(var(...) / <alpha-value>)`
         * tells Tailwind v3 to interpolate the alpha channel so that
         * utility classes like `bg-cyan/15` and `text-cyan/60` apply
         * opacity correctly (otherwise the alpha silently drops).
         *
         * NOTE: amber / violet / red / emerald are kept as Tailwind's
         * default palette because they carry semantic meaning specific
         * to the admin portal:
         *   - amber  = Pro / Elite tier accents
         *   - violet = Analyst / trades analytics
         *   - red    = destructive banners / banned status
         *   - emerald= active / success (alternative to var(--gain))
         * Mapping these into the journal palette would silently degrade
         * the visual information density.
         */
        cyan:    "oklch(var(--cyan-base) / <alpha-value>)",
        gain:    "oklch(var(--gain-base) / <alpha-value>)",
        loss:    "oklch(var(--loss-base) / <alpha-value>)",
        primary: "oklch(var(--cyan-base) / <alpha-value>)",
        destructive: "oklch(var(--loss-base) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
