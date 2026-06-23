import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#070a12",
        panel: "#0e1320",
        line: "#1e2740",
        accent: "#22d3ee",
        accent2: "#34d399",
        warn: "#f59e0b",
        muted: "#7c89a8",
      },
    },
  },
  plugins: [],
};

export default config;
