/** @type {import('tailwindcss').Config}*/

const colors = require('tailwindcss/colors')
const plugin = require('tailwindcss/plugin')

delete colors.lightBlue
delete colors.blueGray
delete colors.trueGray
delete colors.coolGray
delete colors.blueGray
delete colors.warmGray

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
    plugin(function ({ addVariant }) {
      addVariant('child', '& > *');
    })
  ]
};

module.exports = config;
