/** @type {import('tailwindcss').Config}*/

const colors = require('tailwindcss/colors')

const config = {
  darkMode: 'class',
  content: [
    './src/**/*.{html,js,svelte,ts}',
  ],
  theme: {
    colors: {
      ...colors
    },
    fontFamily: {
      sans: ['Graphik', 'sans-serif'],
      serif: ['Merriweather', 'serif'],
    },
  },
  plugins: [
  ]
};

module.exports = config;
