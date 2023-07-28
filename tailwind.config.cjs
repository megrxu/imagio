/** @type {import('tailwindcss').Config}*/

const colors = require('tailwindcss/colors')

delete colors.lightBlue
delete colors.blueGray
delete colors.trueGray
delete colors.coolGray
delete colors.blueGray

const config = {
  darkMode: 'class',
  content: [
    './src/**/*.{html,js,svelte,ts}',
  ],
  theme: {
    extend: {
      colors: colors,
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
