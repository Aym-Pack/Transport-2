module.exports = {
  root: true,
  extends: ['next/core-web-vitals', 'prettier'], // Assumes Prettier is used
  // If you have a custom ESLint config in packages/eslint-config-custom
  // extends: ['custom/next'],
  settings: {
    next: {
      rootDir: __dirname, // Correctly set rootDir for Next.js ESLint plugin
    },
  },
};
