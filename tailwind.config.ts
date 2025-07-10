import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      container: {
        center: true,
        padding: '2rem',
        screens: {
          '2xl': '1400px',
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '65ch',
            color: 'inherit',
          },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          from: {
            backgroundPosition: "0 0",
          },
          to: {
            backgroundPosition: "-200% 0",
          },
        },
      },
      backgroundImage: {
        'dot-black': 'radial-gradient(rgba(0, 0, 0, 0.2) 1px, transparent 1px)',
        'dot-white': 'radial-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot': '16px 16px',
      },
    },
  },
  plugins: [],
};

export default config; 