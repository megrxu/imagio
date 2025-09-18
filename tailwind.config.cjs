/** @type {import('tailwindcss').Config}*/

const colors = require('tailwindcss/colors')
const plugin = require('tailwindcss/plugin')

delete colors.lightBlue
delete colors.blueGray
delete colors.trueGray
delete colors.coolGray
delete colors.blueGray
delete colors.warmGray

const withOpacity = (variable) => ({ opacityValue }) => {
  return opacityValue === undefined
    ? `rgb(var(${variable}))`
    : `rgb(var(${variable}) / ${opacityValue})`
}

const config = {
  darkMode: 'class',
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}',
    './node_modules/flowbite/**/*.{js,ts}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '72rem' },
    },
    extend: {
      colors: {
        // Keep full palette for utility use
        ...colors,

        // Design tokens driven by CSS variables (see src/styles/theme.css)
        primary: withOpacity('--color-primary'),
        secondary: withOpacity('--color-secondary'),
        accent: withOpacity('--color-accent'),
        success: withOpacity('--color-success'),
        warning: withOpacity('--color-warning'),
        danger: withOpacity('--color-danger'),

        surface: withOpacity('--surface'),
        'surface-foreground': withOpacity('--surface-foreground'),
        muted: withOpacity('--muted'),
        border: withOpacity('--border'),
        ring: withOpacity('--ring'),
      },
      borderRadius: {
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-lg)',
      },
      fontFamily: {
        sans: ['Graphik', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'ui-serif', 'serif'],
      },
    },
  },
  plugins: [
    require('flowbite/plugin'),
    plugin(function ({ addVariant }) {
      addVariant('child', '& > *');
    })
  ]
};

module.exports = config;
